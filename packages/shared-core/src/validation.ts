import { isDefined, isSome } from '@tsfpp/prelude';
import type { EdnNode } from './edn-parser.js';
import type { CnjDocument, CnjDomainForm } from './cnj-model.js';
import type { SymbolIndex } from './symbol-index.js';
import { bareName, declaredNames, parseReference, referenceSites } from './references.js';
import type { ReferenceKind, ReferenceSite } from './references.js';
import { EMPTY_PRELUDE, preludeHeads } from './prelude.js';
import type { Prelude } from './prelude.js';
import { findEnsureSites, unverifiableAtMcp } from './postconditions.js';
import { lintRetiredForms } from './migration-lint.js';

export type ValidationMode = 'authored' | 'recovered';

export type ReferenceStatus = {
  readonly ref: string;
  readonly exists: boolean;
};

export type ValidationOptions = {
  readonly index?: SymbolIndex;
  readonly symbolRefs?: ReadonlyArray<string>;
  readonly referencesStatus?: ReadonlyArray<ReferenceStatus>;
  /** The parsed forms, for rules that read expressions: prelude checks and retired forms. */
  readonly ast?: ReadonlyArray<EdnNode>;
};

export type ValidationRule = {
  readonly id: string;
  readonly description: string;
};

export type Violation = {
  readonly rule: string;
  readonly severity: 'error' | 'warning';
  readonly location: string;
  readonly message: string;
};

export type ValidationReport = {
  readonly valid: boolean;
  readonly mode: ValidationMode;
  readonly violations: ReadonlyArray<Violation>;
};

type ViolationSpec = { readonly rule: string; readonly severity: 'error' | 'warning'; readonly location: string; readonly message: string };
const mkV = (spec: ViolationSpec): Violation => spec;

const checkCharter = (doc: CnjDocument, mode: ValidationMode): ReadonlyArray<Violation> => {
  const vs: ReadonlyArray<Violation | null> = [
    doc.charter.title.length === 0 ? mkV({ rule: 'charter-title', severity: 'error', location: 'charter', message: 'Charter must have a non-empty title' }) : null,
    !(/^\d+\.\d+\.\d+/.test(doc.charter.version)) && !(mode === 'recovered' && doc.charter.version === '0.0.0-recovered')
      ? mkV({ rule: 'charter-version', severity: 'error', location: 'charter.version', message: `Version '${doc.charter.version}' must be semver` }) : null,
    doc.charter.goals.length === 0 ? mkV({ rule: 'charter-goals', severity: 'warning', location: 'charter.goals', message: 'Charter should declare at least one goal' }) : null,
  ];
  return vs.filter((x): x is Violation => x !== null);
};

const checkTargets = (doc: CnjDocument): ReadonlyArray<Violation> =>
  doc.targets.flatMap((t) =>
    t.name.length === 0 ? [mkV({ rule: 'target-name', severity: 'error', location: 'target', message: 'Target must have a non-empty name' })] : [],
  );

const checkAssets = (doc: CnjDocument): ReadonlyArray<Violation> =>
  doc.assets.flatMap((a) =>
    a.name.length === 0 ? [mkV({ rule: 'asset-name', severity: 'error', location: 'asset', message: 'Asset must have a non-empty name' })] : [],
  );

const hasTopologyFields = (form: CnjDomainForm): boolean =>
  form.requires.length > 0 || form.forbids.length > 0 || form.deferred.length > 0 || form.prefers.length > 0;

const topologyLocation = (form: CnjDomainForm): string =>
  `${form.formType}:${form.name.length > 0 ? form.name : '(unnamed)'}`;

const overlap = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): ReadonlyArray<string> => {
  const rightKeys = right.map((item) => item.toLowerCase());
  return left.filter((item) => rightKeys.includes(item.toLowerCase()));
};

// `:manifest` is a result binding (core.md · conjure), not a list of capabilities, so
// topology is checked only for contradictions between the topology slots themselves.
const checkTopologyForm = (form: CnjDomainForm, mode: ValidationMode): ReadonlyArray<Violation> => {
  if (!hasTopologyFields(form)) return [];
  const loc = topologyLocation(form);
  const severity = mode === 'authored' ? 'error' : 'warning';

  // A load-bearing capability cannot also be forbidden: the spec says surface it, never resolve it.
  const forbidsConflicts: ReadonlyArray<Violation> = overlap(form.requires, form.forbids)
    .map((item) => mkV({ rule: 'intent-topology-forbids', severity, location: loc, message: `'${item}' cannot be both :requires and :forbids` }));

  // A load-bearing capability cannot also be deferred.
  const deferredConflicts: ReadonlyArray<Violation> = overlap(form.requires, form.deferred)
    .map((item) => mkV({ rule: 'intent-topology-conflict', severity, location: loc, message: `'${item}' cannot be both :requires and :deferred` }));

  // A preference for something forbidden is always overridden; flag it so the intent is visible.
  const preferenceConflicts: ReadonlyArray<Violation> = overlap(form.prefers, form.forbids)
    .map((item) => mkV({ rule: 'intent-topology-prefers-forbids', severity: 'warning', location: loc, message: `'${item}' is both preferred and forbidden; :forbids wins` }));

  return [...forbidsConflicts, ...deferredConflicts, ...preferenceConflicts];
};

const checkIntentTopology = (doc: CnjDocument, mode: ValidationMode): ReadonlyArray<Violation> =>
  doc.domainForms.flatMap((form) => checkTopologyForm(form, mode));

export const checkSymbolUsage = (
  symbolRefs: ReadonlyArray<string>,
  index: SymbolIndex,
): ReadonlyArray<Violation> =>
  symbolRefs
    .filter((sym) => !index.symbols.has(sym) && !preludeHeads(index.prelude ?? EMPTY_PRELUDE).includes(sym))
    .map((sym) =>
      mkV({ rule: 'symbol-usage', severity: 'warning', location: 'document', message: `Symbol '${sym}' is not in the Conjurer index` }),
    );

export const checkReferences = (
  referencesStatus: ReadonlyArray<ReferenceStatus>,
): ReadonlyArray<Violation> =>
  referencesStatus
    .filter((r) => !r.exists)
    .map((r) =>
      mkV({ rule: 'references-resolve', severity: 'error', location: 'charter.references', message: `Reference '${r.ref}' does not resolve to a readable file` }),
    );

// ── Convention lint (all warning-only) ────────────────────────────────────────

const ednStr = (n: EdnNode | undefined): string => {
  if (n === undefined) return '';
  if (n.type === 'string') return n.value;
  if (n.type === 'keyword') return n.value.substring(1);
  if (n.type === 'symbol') return n.value;
  return '';
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const checkDecisionsConventions = (doc: CnjDocument): ReadonlyArray<Violation> =>
  doc.charter.decisions.flatMap((entry, i): ReadonlyArray<Violation> => {
    const date = ednStr(entry.get('date'));
    const decision = ednStr(entry.get('decision'));
    const loc = `charter.decisions[${i}]`;
    const dateViolations: ReadonlyArray<Violation> = date.length === 0
      ? [mkV({ rule: 'decisions-entry-shape', severity: 'warning', location: loc, message: `Decision entry at index ${i} is missing a :date value` })]
      : DATE_RE.test(date)
        ? []
        : [mkV({ rule: 'decisions-date-format', severity: 'warning', location: `${loc}.date`, message: `Decision date '${date}' should be in YYYY-MM-DD format` })];
    const decisionViolations: ReadonlyArray<Violation> = decision.length === 0
      ? [mkV({ rule: 'decisions-entry-shape', severity: 'warning', location: loc, message: `Decision entry at index ${i} is missing a :decision value` })]
      : [];
    return [...dateViolations, ...decisionViolations];
  });

const checkDecisionIds = (doc: CnjDocument): ReadonlyArray<Violation> => {
  const ids = doc.charter.decisions.map((entry) => bareName(ednStr(entry.get('id'))));
  return ids.flatMap((id, i): ReadonlyArray<Violation> =>
    id.length > 0 && ids.indexOf(id) !== i
      ? [mkV({ rule: 'decision-id-unique', severity: 'error', location: `charter.decisions[${i}].id`, message: `Decision id '${id}' is already used by an earlier entry` })]
      : []);
};

const siteReference = (site: ReferenceSite): { readonly kind: ReferenceKind; readonly name: string } | undefined => {
  const parsed = parseReference(site.raw);
  if (isSome(parsed)) return parsed.value;
  return site.impliedKind !== undefined ? { kind: site.impliedKind, name: bareName(site.raw) } : undefined;
};

/**
 * Check reference keywords (`f/hoist :into`, decision `:supersedes`) against the names this
 * document declares (core.md · Names and references). Unresolved references are warnings:
 * the declaration may live in another file of the workspace.
 *
 * @param doc - The parsed document.
 * @returns Violations for malformed or unresolved references and duplicate decision ids.
 */
export const checkFormReferences = (doc: CnjDocument): ReadonlyArray<Violation> => {
  const declared = declaredNames(doc);
  const siteViolations = referenceSites(doc).flatMap((site): ReadonlyArray<Violation> => {
    const ref = siteReference(site);
    if (ref === undefined) {
      return [mkV({ rule: 'reference-kind', severity: 'warning', location: site.location, message: `'${site.raw}' is not a reference keyword; write it as :decision/<id>, :target/<name>, :spell/<name> or :core/<name>` })];
    }
    if (ref.kind === 'core') return [];
    const known = declared.get(ref.kind) ?? [];
    return known.includes(ref.name)
      ? []
      : [mkV({ rule: 'reference-resolves', severity: 'warning', location: site.location, message: `${ref.kind} '${ref.name}' is not declared in this file` })];
  });
  return [...checkDecisionIds(doc), ...siteViolations];
};

const checkDecisionsOrder = (doc: CnjDocument): ReadonlyArray<Violation> => {
  const dated = doc.charter.decisions
    .map((entry, i) => ({ date: ednStr(entry.get('date')), i }))
    .filter((x) => DATE_RE.test(x.date));
  return dated.flatMap(({ date, i }, pos): ReadonlyArray<Violation> => {
    const prev = dated[pos - 1];
    return isDefined(prev) && date < prev.date
      ? [mkV({ rule: 'decisions-chronological-order', severity: 'warning', location: `charter.decisions[${i}]`, message: `Decision at index ${i} (${date}) is earlier than the preceding entry (${prev.date})` })]
      : [];
  });
};

const checkTargetConventions = (doc: CnjDocument): ReadonlyArray<Violation> =>
  doc.targets.flatMap((t): ReadonlyArray<Violation> =>
    t.language.length === 0
      ? [mkV({ rule: 'target-has-language', severity: 'warning', location: `target:${t.name.length > 0 ? t.name : '(unnamed)'}`, message: `Target '${t.name}' should declare a :language` })]
      : [],
  );

/**
 * Structural postconditions that name `:mcp` as their layer but use a semantic function:
 * the MCP layer cannot check them, so the claim is flagged (core.md · ensure; The prelude).
 *
 * @param forms - Parsed top-level forms.
 * @param prelude - The prelude of the spec in use.
 * @returns One warning per such predicate.
 */
export const checkEnsurePrelude = (forms: ReadonlyArray<EdnNode>, prelude: Prelude): ReadonlyArray<Violation> =>
  unverifiableAtMcp(findEnsureSites(forms), prelude).map((u) =>
    mkV({ rule: 'ensure-mcp-prelude', severity: 'warning', location: u.owner, message: `:structural ${u.predicate} uses ${u.heads.join(', ')}, outside the prelude: :mcp cannot check it; it is enforced at :llm` }));

export const lintConventions = (doc: CnjDocument): ReadonlyArray<Violation> => [
  ...checkDecisionsConventions(doc),
  ...checkDecisionsOrder(doc),
  ...checkTargetConventions(doc),
];

export const VALIDATION_RULE_DESCRIPTIONS: Readonly<Record<string, ReadonlyArray<string>>> = {
  charter: [
    'must have a non-empty title (charter-title)',
    'version must be semver (charter-version)',
    'at least one goal should be declared (charter-goals)',
  ],
  target: [
    'must have a non-empty name (target-name)',
    'should declare a :language (target-has-language)',
  ],
  asset: ['must have a non-empty name (asset-name)'],
  topology: [
    'no item may be both :requires and :forbids (intent-topology-forbids)',
    'no item may be both :requires and :deferred (intent-topology-conflict)',
    'an item both :prefers and :forbids is flagged; :forbids wins (intent-topology-prefers-forbids)',
  ],
  ensure: [
    ':structural predicates verified via :mcp are written in the prelude (ensure-mcp-prelude)',
  ],
  retired: [
    'forms retired in October 2026 are flagged with their replacement (deprecated-*)',
  ],
  references: [
    'f/hoist :into and decision :supersedes resolve to a declared name (reference-resolves)',
    'f/hoist :into is a reference keyword such as :decision/<id> (reference-kind)',
  ],
  decisions: [
    'decision :id values are unique (decision-id-unique)',
    'each entry must have a non-empty :date and :decision (decisions-entry-shape)',
    ':date value must be in YYYY-MM-DD format (decisions-date-format)',
    'entries should be in non-decreasing date order (decisions-chronological-order)',
  ],
  context: ['must declare :scope and :description fields'],
  assume: [':condition must be a non-empty string'],
  handover: [':to must reference a known target in the workspace'],
  ritual: ['steps must form an ordered list'],
};

const indexViolations = (options: ValidationOptions | undefined): ReadonlyArray<Violation> => {
  const index = options?.index;
  if (index === undefined) return [];
  const symbolViolations = isDefined(options?.symbolRefs) ? checkSymbolUsage(options.symbolRefs, index) : [];
  const preludeViolations = isDefined(index.prelude) ? checkEnsurePrelude(options?.ast ?? [], index.prelude) : [];
  return [...symbolViolations, ...preludeViolations];
};

const optionalViolations = (options: ValidationOptions | undefined): ReadonlyArray<Violation> => [
  ...indexViolations(options),
  ...(isDefined(options?.referencesStatus) ? checkReferences(options.referencesStatus) : []),
  ...lintRetiredForms(options?.ast ?? []),
];

/**
 * Validate a `.cnj` document.
 *
 * @param doc - The parsed document.
 * @param mode - `authored` or `recovered`.
 * @param options - Symbol index, symbol references, reference status and parsed forms, when available.
 * @returns The report; valid when no violation is an error.
 */
export const validateCnj = (
  doc: CnjDocument,
  mode: ValidationMode,
  options?: ValidationOptions,
): ValidationReport => {
  const violations: ReadonlyArray<Violation> = [
    ...checkCharter(doc, mode),
    ...checkTargets(doc),
    ...checkAssets(doc),
    ...checkIntentTopology(doc, mode),
    ...checkFormReferences(doc),
    ...optionalViolations(options),
    ...lintConventions(doc),
  ];
  return {
    valid: violations.every((viol) => viol.severity !== 'error'),
    mode,
    violations,
  };
};

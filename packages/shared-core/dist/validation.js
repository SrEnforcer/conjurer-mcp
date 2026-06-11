import { isDefined } from '@tsfpp/prelude';
const mkV = (spec) => spec;
const checkCharter = (doc, mode) => {
    const vs = [
        doc.charter.title.length === 0 ? mkV({ rule: 'charter-title', severity: 'error', location: 'charter', message: 'Charter must have a non-empty title' }) : null,
        !(/^\d+\.\d+\.\d+/.test(doc.charter.version)) && !(mode === 'recovered' && doc.charter.version === '0.0.0-recovered')
            ? mkV({ rule: 'charter-version', severity: 'error', location: 'charter.version', message: `Version '${doc.charter.version}' must be semver` }) : null,
        doc.charter.goals.length === 0 ? mkV({ rule: 'charter-goals', severity: 'warning', location: 'charter.goals', message: 'Charter should declare at least one goal' }) : null,
    ];
    return vs.filter((x) => x !== null);
};
const checkTargets = (doc) => doc.targets.flatMap((t) => t.name.length === 0 ? [mkV({ rule: 'target-name', severity: 'error', location: 'target', message: 'Target must have a non-empty name' })] : []);
const checkAssets = (doc) => doc.assets.flatMap((a) => a.name.length === 0 ? [mkV({ rule: 'asset-name', severity: 'error', location: 'asset', message: 'Asset must have a non-empty name' })] : []);
const hasTopologyFields = (form) => form.requires.length > 0 || form.deferred.length > 0 || form.manifest.length > 0 || form.prefers.length > 0;
const topologyLocation = (form) => `${form.formType}:${form.name.length > 0 ? form.name : '(unnamed)'}`;
const checkTopologyForm = (form, mode) => {
    if (!hasTopologyFields(form))
        return [];
    const loc = topologyLocation(form);
    const manifested = new Set(form.manifest.map((s) => s.toLowerCase()));
    const deferred = new Set(form.deferred.map((s) => s.toLowerCase()));
    // Rule (a): every :requires item must appear in :manifest — enforced in both modes
    const requiresViolations = form.requires
        .filter((item) => !manifested.has(item.toLowerCase()))
        .map((item) => mkV({ rule: 'intent-topology-requires', severity: 'error', location: loc, message: `:requires item '${item}' is not in :manifest` }));
    // Rule (b): no :deferred item may appear in :manifest — relaxed in :recovered
    const deferredViolations = mode === 'authored'
        ? form.deferred
            .filter((item) => manifested.has(item.toLowerCase()))
            .map((item) => mkV({ rule: 'intent-topology-deferred', severity: 'error', location: loc, message: `:deferred item '${item}' must not appear in :manifest` }))
        : [];
    // Rule (c): no item may be both :requires and :deferred — relaxed in :recovered
    const conflictViolations = mode === 'authored'
        ? form.requires
            .filter((item) => deferred.has(item.toLowerCase()))
            .map((item) => mkV({ rule: 'intent-topology-conflict', severity: 'error', location: loc, message: `'${item}' cannot be both :requires and :deferred` }))
        : [];
    return [...requiresViolations, ...deferredViolations, ...conflictViolations];
};
const checkIntentTopology = (doc, mode) => doc.domainForms.flatMap((form) => checkTopologyForm(form, mode));
export const checkSymbolUsage = (symbolRefs, index) => symbolRefs
    .filter((sym) => !index.symbols.has(sym))
    .map((sym) => mkV({ rule: 'symbol-usage', severity: 'warning', location: 'document', message: `Symbol '${sym}' is not in the Conjurer index` }));
export const checkReferences = (referencesStatus) => referencesStatus
    .filter((r) => !r.exists)
    .map((r) => mkV({ rule: 'references-resolve', severity: 'error', location: 'charter.references', message: `Reference '${r.ref}' does not resolve to a readable file` }));
// ── Convention lint (all warning-only) ────────────────────────────────────────
const ednStr = (n) => {
    if (n === undefined)
        return '';
    if (n.type === 'string')
        return n.value;
    if (n.type === 'keyword')
        return n.value.substring(1);
    if (n.type === 'symbol')
        return n.value;
    return '';
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const checkDecisionsConventions = (doc) => doc.charter.decisions.flatMap((entry, i) => {
    const date = ednStr(entry.get('date'));
    const decision = ednStr(entry.get('decision'));
    const loc = `charter.decisions[${i}]`;
    const vs = [];
    if (date.length === 0)
        vs.push(mkV({ rule: 'decisions-entry-shape', severity: 'warning', location: loc, message: `Decision entry at index ${i} is missing a :date value` }));
    else if (!DATE_RE.test(date))
        vs.push(mkV({ rule: 'decisions-date-format', severity: 'warning', location: `${loc}.date`, message: `Decision date '${date}' should be in YYYY-MM-DD format` }));
    if (decision.length === 0)
        vs.push(mkV({ rule: 'decisions-entry-shape', severity: 'warning', location: loc, message: `Decision entry at index ${i} is missing a :decision value` }));
    return vs;
});
const checkDecisionsOrder = (doc) => {
    const dated = doc.charter.decisions
        .map((entry, i) => ({ date: ednStr(entry.get('date')), i }))
        .filter((x) => DATE_RE.test(x.date));
    return dated.flatMap(({ date, i }, pos) => {
        const prev = dated[pos - 1];
        return isDefined(prev) && date < prev.date
            ? [mkV({ rule: 'decisions-chronological-order', severity: 'warning', location: `charter.decisions[${i}]`, message: `Decision at index ${i} (${date}) is earlier than the preceding entry (${prev.date})` })]
            : [];
    });
};
const checkTargetConventions = (doc) => doc.targets.flatMap((t) => t.language.length === 0
    ? [mkV({ rule: 'target-has-language', severity: 'warning', location: `target:${t.name.length > 0 ? t.name : '(unnamed)'}`, message: `Target '${t.name}' should declare a :language` })]
    : []);
export const lintConventions = (doc) => [
    ...checkDecisionsConventions(doc),
    ...checkDecisionsOrder(doc),
    ...checkTargetConventions(doc),
];
export const VALIDATION_RULE_DESCRIPTIONS = {
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
    spell: [
        'every :requires item must appear in :manifest (intent-topology-requires)',
        'no :deferred item may appear in :manifest (intent-topology-deferred)',
        'no item may be both :requires and :deferred (intent-topology-conflict)',
    ],
    decisions: [
        'each entry must have a non-empty :date and :decision (decisions-entry-shape)',
        ':date value must be in YYYY-MM-DD format (decisions-date-format)',
        'entries should be in non-decreasing date order (decisions-chronological-order)',
    ],
    context: ['must declare :scope and :description fields'],
    assume: [':condition must be a non-empty string'],
    handover: [':to must reference a known target in the workspace'],
    ritual: ['steps must form an ordered list'],
};
export const validateCnj = (doc, mode, options) => {
    const coreViolations = [
        ...checkCharter(doc, mode),
        ...checkTargets(doc),
        ...checkAssets(doc),
        ...checkIntentTopology(doc, mode),
    ];
    const symbolViolations = isDefined(options?.index) && isDefined(options?.symbolRefs)
        ? checkSymbolUsage(options.symbolRefs, options.index)
        : [];
    const referenceViolations = isDefined(options?.referencesStatus)
        ? checkReferences(options.referencesStatus)
        : [];
    const conventionViolations = lintConventions(doc);
    const violations = [...coreViolations, ...symbolViolations, ...referenceViolations, ...conventionViolations];
    return {
        valid: violations.every((viol) => viol.severity !== 'error'),
        mode,
        violations,
    };
};
//# sourceMappingURL=validation.js.map
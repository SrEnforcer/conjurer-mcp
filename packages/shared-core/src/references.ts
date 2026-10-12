/**
 * Names and references between forms (core.md · Names and references).
 *
 * A name may be written as a symbol or a keyword; both denote the same name. A reference
 * to a form of a given kind is a keyword namespaced by that kind: `:decision/<id>`,
 * `:target/<name>`, `:spell/<name>`. Pure — no I/O.
 */
import { none, some, isSome, intoMap } from '@tsfpp/prelude';
import type { Option } from '@tsfpp/prelude';
import type { EdnNode } from './edn-parser.js';
import type { CnjDocument } from './cnj-model.js';

/** The kinds a reference keyword may name; `core` names a construct or section of core. */
export type ReferenceKind = 'decision' | 'target' | 'asset' | 'spell' | 'shape' | 'candidate' | 'core';

/** A parsed reference keyword. */
export type FormReference = {
  readonly kind: ReferenceKind;
  readonly name: string;
};

/** Where in a document a reference was written, for diagnostics. */
export type ReferenceSite = {
  readonly location: string;
  readonly raw: string;
  /** The kind a bare value refers to when the site fixes it (`:supersedes` names a decision). */
  readonly impliedKind?: ReferenceKind;
};

const KINDS: ReadonlyArray<ReferenceKind> = ['decision', 'target', 'asset', 'spell', 'shape', 'candidate', 'core'];

/** Kind prefixes written before the October 2026 reference syntax, read as their current kind. */
const LEGACY_KINDS: ReadonlyMap<string, ReferenceKind> = intoMap([['charter-decision', 'decision']]);

const toKind = (prefix: string): Option<ReferenceKind> => {
  const current = KINDS.find((kind) => kind === prefix);
  if (current !== undefined) return some(current);
  const legacy = LEGACY_KINDS.get(prefix);
  return legacy !== undefined ? some(legacy) : none;
};

/**
 * Parse a reference keyword (with or without its leading colon).
 *
 * @param raw - Text such as `:decision/amendment-approval` or `target/api`.
 * @returns The kind and name, or none when the text is not a reference keyword.
 */
export const parseReference = (raw: string): Option<FormReference> => {
  const text = raw.startsWith(':') ? raw.substring(1) : raw;
  const slash = text.indexOf('/');
  if (slash <= 0 || slash === text.length - 1) return none;
  const kind = toKind(text.substring(0, slash));
  return isSome(kind) ? some({ kind: kind.value, name: text.substring(slash + 1) }) : none;
};

/**
 * Reduce a name or a reference to the bare name it denotes.
 *
 * @param raw - A symbol, keyword or reference keyword.
 * @returns The bare name: `:api`, `api` and `:target/api` all give `api`.
 */
export const bareName = (raw: string): string => {
  const ref = parseReference(raw);
  if (isSome(ref)) return ref.value.name;
  return raw.startsWith(':') ? raw.substring(1) : raw;
};

const ednText = (node: EdnNode | undefined): string => {
  if (node === undefined) return '';
  if (node.type === 'string' || node.type === 'symbol') return node.value;
  if (node.type === 'keyword') return node.value.substring(1);
  return '';
};

const NAMED_FORMS: ReadonlyMap<string, ReferenceKind> = intoMap([
  ['spell', 'spell'],
  ['incantation', 'spell'],
  ['shape', 'shape'],
]);

/**
 * Names a document declares, by kind.
 *
 * @param doc - The parsed document.
 * @returns For each kind, the bare names declared in this document.
 */
export const declaredNames = (doc: CnjDocument): ReadonlyMap<ReferenceKind, ReadonlyArray<string>> => {
  const named = (kind: ReferenceKind): ReadonlyArray<string> =>
    doc.domainForms.filter((form) => NAMED_FORMS.get(form.formType) === kind).map((form) => bareName(form.name));
  return intoMap<ReferenceKind, ReadonlyArray<string>>([
    ['decision', doc.charter.decisions.map((entry) => bareName(ednText(entry.get('id')))).filter((id) => id.length > 0)],
    ['target', doc.targets.map((target) => bareName(target.name))],
    ['asset', doc.assets.map((asset) => bareName(asset.name))],
    ['spell', named('spell')],
    ['shape', named('shape')],
    ['candidate', doc.candidates.map((candidate) => bareName(candidate.id))],
    ['core', []],
  ]);
};

/**
 * Names bound to a value in a document: `def` forms, `:manifest` bindings, and targets.
 * A target's `:from` may refer to any of these (core.md · target).
 *
 * @param doc - The parsed document.
 * @returns Bare binding names, without duplicates.
 */
export const bindingNames = (doc: CnjDocument): ReadonlyArray<string> => {
  const defs = doc.domainForms.filter((form) => form.formType === 'def').map((form) => bareName(form.name));
  const manifests = doc.domainForms.flatMap((form) => form.manifest.map(bareName));
  const targets = doc.targets.map((target) => bareName(target.name));
  return [...defs, ...manifests, ...targets]
    .filter((name, i, all) => name.length > 0 && all.indexOf(name) === i);
};

/**
 * The places in a document that hold a reference keyword: `f/hoist :into` and decision `:supersedes`.
 *
 * @param doc - The parsed document.
 * @returns Reference sites with their raw text.
 */
export const referenceSites = (doc: CnjDocument): ReadonlyArray<ReferenceSite> => [
  ...doc.hoists
    .filter((hoist) => hoist.into.length > 0)
    .map((hoist) => ({ location: `f/hoist:${hoist.of}.into`, raw: hoist.into })),
  ...doc.charter.decisions.flatMap((entry, i) => {
    const supersedes = ednText(entry.get('supersedes'));
    return supersedes.length > 0
      ? [{ location: `charter.decisions[${i}].supersedes`, raw: supersedes, impliedKind: 'decision' as const }]
      : [];
  }),
];

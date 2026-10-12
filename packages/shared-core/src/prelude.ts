/**
 * The Conjurer prelude (core grimoire, Part V): the closed set of expression
 * forms a deterministic processor may evaluate. Every other head is a semantic
 * function and belongs to the model.
 *
 * The prelude is read from the live spec (`:prelude` in index.edn), never
 * embedded. A spec without `:prelude` yields no prelude, and callers skip the
 * checks that depend on it.
 */
import { isDefined } from '@tsfpp/prelude';
import type { EdnNode, EdnList, EdnMap } from './edn-parser.js';

export type Prelude = {
  readonly types: ReadonlyArray<string>;
  readonly predicates: ReadonlyArray<string>;
  readonly expansion: ReadonlyArray<string>;
  readonly keywordAccess: boolean;
  readonly openUnits: boolean;
};

/** How a single head was read. */
export type HeadKind = 'predicate' | 'type' | 'unit' | 'access' | 'expansion' | 'allowed' | 'semantic';

export type SemanticHead = {
  readonly head: string;
  readonly line: number;
  readonly column: number;
};

export type Classification = {
  /** True when every head in the expression is a prelude form or an allowed head. */
  readonly deterministic: boolean;
  readonly semanticHeads: ReadonlyArray<SemanticHead>;
  /** Symbols outside head position: free variables or names a binding must supply. */
  readonly freeVariables: ReadonlyArray<string>;
};

export type ClassifyOptions = {
  /** Extra heads that count as deterministic here, e.g. an incantation's parameters and registered spells. */
  readonly allowedHeads?: ReadonlyArray<string>;
};

// ── Reading :prelude from index.edn ──────────────────────────────────────────

const symbolNames = (n: EdnNode | undefined): ReadonlyArray<string> =>
  isDefined(n) && n.type === 'list'
    ? n.elements.flatMap((e) => (e.type === 'symbol' ? [e.value] : []))
    : [];

const isKeyword = (n: EdnNode | undefined, value: string): boolean =>
  isDefined(n) && n.type === 'keyword' && n.value === value;

/**
 * Read the prelude from the root map of index.edn.
 *
 * @param root - The parsed index.edn root map.
 * @returns The prelude, or undefined when the spec declares none.
 */
export const parsePrelude = (root: EdnMap): Prelude | undefined => {
  const p = root.entries.get('prelude');
  if (!isDefined(p) || p.type !== 'map') return undefined;
  return {
    types: symbolNames(p.entries.get('types')),
    predicates: symbolNames(p.entries.get('predicates')),
    expansion: symbolNames(p.entries.get('expansion')),
    keywordAccess: isKeyword(p.entries.get('access'), ':keyword-lookup'),
    openUnits: isKeyword(p.entries.get('units'), ':open-family'),
  };
};

// ── Classifying a form ───────────────────────────────────────────────────────

/** A call form: a parenthesised list with a head. Vectors and sets are data. */
export const isCall = (n: EdnList): boolean =>
  n.delim !== 'bracket' && n.delim !== 'set' && n.elements.length > 0;

const isCallNode = (n: EdnNode): n is EdnList => n.type === 'list' && isCall(n);

const isUnitForm = (form: EdnList, prelude: Prelude): boolean =>
  prelude.openUnits && form.elements.length === 2 && form.elements[1]?.type === 'number';

/**
 * Read the head of a call form.
 *
 * @param form - A call form.
 * @param prelude - The prelude in force.
 * @param allowed - Heads that count as deterministic in this context.
 * @returns The kind of head.
 */
const namedKind = (name: string, prelude: Prelude): HeadKind | undefined => {
  if (prelude.predicates.includes(name)) return 'predicate';
  if (prelude.types.includes(name)) return 'type';
  return prelude.expansion.includes(name) ? 'expansion' : undefined;
};

export const headKind = (form: EdnList, prelude: Prelude, allowed: ReadonlyArray<string>): HeadKind => {
  const head = form.elements[0];
  if (!isDefined(head)) return 'semantic';
  if (head.type === 'keyword') return prelude.keywordAccess && form.elements.length === 2 ? 'access' : 'semantic';
  if (head.type !== 'symbol') return 'semantic';
  const named = namedKind(head.value, prelude);
  if (isDefined(named)) return named;
  if (allowed.includes(head.value)) return 'allowed';
  return isUnitForm(form, prelude) ? 'unit' : 'semantic';
};

const headName = (form: EdnList): string => {
  const h = form.elements[0];
  if (!isDefined(h)) return '';
  return h.type === 'symbol' || h.type === 'keyword' ? h.value : h.type;
};

type Found = { readonly semantic: ReadonlyArray<SemanticHead>; readonly free: ReadonlyArray<string> };
const NONE: Found = { semantic: [], free: [] };
const merge = (parts: ReadonlyArray<Found>): Found => ({
  semantic: parts.flatMap((p) => p.semantic),
  free: parts.flatMap((p) => p.free),
});

type Walk = (n: EdnNode) => Found;

/** Type forms take modifiers (flags, pairs, type names); only nested calls are walked. */
const walkTypeForm = (form: EdnList, walk: Walk): Found =>
  merge(form.elements.slice(1).filter(isCallNode).map(walk));

/** Names bound by `(for [name coll ...] ...)`: they are not free in the body. */
const forBound = (form: EdnList): ReadonlyArray<string> => {
  const [head, binding] = form.elements;
  if (!isDefined(head) || head.type !== 'symbol' || head.value !== 'for') return [];
  if (!isDefined(binding) || binding.type !== 'list') return [];
  return binding.elements.flatMap((e, i) => (i % 2 === 0 && e.type === 'symbol' ? [e.value] : []));
};

type WalkCtx = { readonly prelude: Prelude; readonly allowed: ReadonlyArray<string>; readonly walk: Walk };

const walkCall = (form: EdnList, ctx: WalkCtx): Found => {
  const { walk } = ctx;
  const kind = headKind(form, ctx.prelude, ctx.allowed);
  const args = form.elements.slice(1);
  if (kind === 'type') return walkTypeForm(form, walk);
  if (kind === 'unit') return NONE;
  const bound = forBound(form);
  const walked = merge(args.map(walk));
  const inner = { semantic: walked.semantic, free: walked.free.filter((f) => !bound.includes(f)) };
  return kind === 'semantic'
    ? { semantic: [{ head: headName(form), line: form.line, column: form.column }, ...inner.semantic], free: inner.free }
    : inner;
};

const walker = (prelude: Prelude, allowed: ReadonlyArray<string>): Walk => {
  const walk: Walk = (n) => {
    if (n.type === 'symbol') return { semantic: [], free: [n.value] };
    if (n.type === 'map') return merge(Array.from(n.entries.values()).map(walk));
    if (n.type !== 'list') return NONE;
    return isCall(n) ? walkCall(n, { prelude, allowed, walk }) : merge(n.elements.map(walk));
  };
  return walk;
};

const unique = (xs: ReadonlyArray<string>): ReadonlyArray<string> =>
  xs.filter((x, i) => xs.indexOf(x) === i);

/**
 * Classify an expression against the prelude: which heads are semantic
 * functions, and which free variables a binding would have to supply.
 *
 * @param node - The expression.
 * @param prelude - The prelude in force.
 * @param options - Extra heads that count as deterministic here.
 * @returns The classification; never guesses at a semantic head.
 */
export const classifyExpression = (node: EdnNode, prelude: Prelude, options?: ClassifyOptions): Classification => {
  const found = walker(prelude, options?.allowedHeads ?? [])(node);
  return {
    deterministic: found.semantic.length === 0,
    semanticHeads: found.semantic,
    freeVariables: unique(found.free),
  };
};

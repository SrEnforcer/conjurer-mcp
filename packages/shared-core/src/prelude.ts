/**
 * The Conjurer prelude (core.md · Part V · The prelude): the closed list of expression forms a
 * deterministic processor may evaluate. Every other head is a semantic function, resolved by
 * the model and never evaluated here. The list itself is read from `index.edn` `:prelude`.
 *
 * Pure — no I/O.
 */
import { ok, err, isErr, intoMap, fromNullable, isSome, absurd } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import type { EdnNode, EdnList } from './edn-parser.js';

/** Heads the prelude allows, by family, as listed under `:prelude` in `index.edn`. */
export type Prelude = {
  readonly predicates: ReadonlyArray<string>;
  readonly types: ReadonlyArray<string>;
  readonly expansion: ReadonlyArray<string>;
};

/** A prelude with no heads: used when the spec in use predates `:prelude`. */
export const EMPTY_PRELUDE: Prelude = { predicates: [], types: [], expansion: [] };

const symbolsOf = (node: EdnNode | undefined): ReadonlyArray<string> =>
  node !== undefined && node.type === 'list'
    ? node.elements.flatMap((el) => (el.type === 'symbol' ? [el.value] : []))
    : [];

/**
 * Read the `:prelude` map of `index.edn`.
 *
 * @param node - The value of `:prelude`, if present.
 * @returns The prelude heads; empty families when absent.
 */
export const parsePrelude = (node: EdnNode | undefined): Prelude =>
  node === undefined || node.type !== 'map'
    ? EMPTY_PRELUDE
    : {
      predicates: symbolsOf(node.entries.get('predicates')),
      types: symbolsOf(node.entries.get('types')),
      expansion: symbolsOf(node.entries.get('expansion')),
    };

/**
 * All heads the prelude allows in call position.
 *
 * @param prelude - The prelude in use.
 * @returns Predicate, type and expansion heads.
 */
export const preludeHeads = (prelude: Prelude): ReadonlyArray<string> =>
  [...prelude.predicates, ...prelude.types, ...prelude.expansion];

const isCall = (list: EdnList): boolean => list.delimiter === undefined && list.elements.length > 0;

const headOf = (call: EdnList): string => {
  const head = call.elements[0];
  return head !== undefined && head.type === 'symbol' ? head.value : '';
};

// A unit form is one head naming a unit or currency and one numeric magnitude: (eur 10000).
const isUnitForm = (call: EdnList, prelude: Prelude): boolean => {
  const [head, magnitude, ...rest] = call.elements;
  return head?.type === 'symbol' && !preludeHeads(prelude).includes(head.value)
    && magnitude?.type === 'number' && rest.length === 0;
};

/**
 * Heads in an expression that are semantic functions — outside the prelude.
 *
 * @param node - Any expression.
 * @param prelude - The prelude in use.
 * @returns The offending heads; empty when the whole expression is in the prelude.
 */
export const semanticHeads = (node: EdnNode, prelude: Prelude): ReadonlyArray<string> => {
  if (node.type === 'map') return Array.from(node.entries.values()).flatMap((v) => semanticHeads(v, prelude));
  if (node.type !== 'list') return [];
  if (!isCall(node)) return node.elements.flatMap((el) => semanticHeads(el, prelude));
  const [head, ...args] = node.elements;
  const argHeads = args.flatMap((el) => semanticHeads(el, prelude));
  if (head?.type === 'keyword') return argHeads;
  const name = headOf(node);
  if (preludeHeads(prelude).includes(name) || isUnitForm(node, prelude)) return argHeads;
  return [name.length > 0 ? name : '(non-symbol head)', ...argHeads];
};

/**
 * Whether an expression lies wholly in the prelude, so a deterministic processor may evaluate it.
 *
 * @param node - Any expression.
 * @param prelude - The prelude in use.
 * @returns True when no semantic function occurs in it.
 */
export const isPreludeExpr = (node: EdnNode, prelude: Prelude): boolean =>
  semanticHeads(node, prelude).length === 0;

// ── Evaluation ───────────────────────────────────────────────────────────────

/** A value a prelude predicate operates on. */
export type PreludeValue =
  | { readonly k: 'num'; readonly v: number }
  | { readonly k: 'str'; readonly v: string }
  | { readonly k: 'kw'; readonly v: string }
  | { readonly k: 'bool'; readonly v: boolean }
  | { readonly k: 'nil' }
  | { readonly k: 'unit'; readonly unit: string; readonly v: number }
  | { readonly k: 'seq'; readonly items: ReadonlyArray<PreludeValue> }
  | { readonly k: 'set'; readonly items: ReadonlyArray<PreludeValue> }
  | { readonly k: 'map'; readonly entries: ReadonlyMap<string, PreludeValue> };

/** Why an expression could not be evaluated. */
export type EvalIssue =
  | { readonly kind: 'semantic'; readonly heads: ReadonlyArray<string> }
  | { readonly kind: 'unbound'; readonly name: string }
  | { readonly kind: 'type'; readonly message: string };

type Env = ReadonlyMap<string, PreludeValue>;
type EvalResult = Result<PreludeValue, EvalIssue>;

const typeErr = (message: string): EvalResult => err({ kind: 'type', message });

const equal = (a: PreludeValue, b: PreludeValue): boolean => {
  if (a.k === 'seq' || a.k === 'set') {
    return (b.k === a.k) && a.items.length === b.items.length && a.items.every((x, i) => {
      const y = b.items[i];
      return y !== undefined && (a.k === 'set' ? b.items.some((z) => equal(x, z)) : equal(x, y));
    });
  }
  if (a.k === 'map') {
    return b.k === 'map' && a.entries.size === b.entries.size
      && Array.from(a.entries.entries()).every(([key, v]) => {
        const w = b.entries.get(key);
        return w !== undefined && equal(v, w);
      });
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

const literal = (node: EdnNode): PreludeValue | undefined => {
  switch (node.type) {
    case 'number': return { k: 'num', v: node.value };
    case 'string': return { k: 'str', v: node.value };
    case 'keyword': return { k: 'kw', v: node.value.substring(1) };
    case 'boolean': return { k: 'bool', v: node.value };
    case 'nil': return { k: 'nil' };
    case 'symbol':
    case 'list':
    case 'map': return undefined;
    default: return absurd(node);
  }
};

const magnitudeOf = (v: PreludeValue): { readonly unit: string; readonly v: number } | undefined => {
  if (v.k === 'num') return { unit: '', v: v.v };
  if (v.k === 'unit') return { unit: v.unit, v: v.v };
  return undefined;
};

type Comparison = (a: number, b: number) => boolean;

const COMPARE: ReadonlyMap<string, Comparison> = intoMap<string, Comparison>([
  ['<', (a: number, b: number): boolean => a < b],
  ['<=', (a: number, b: number): boolean => a <= b],
  ['>', (a: number, b: number): boolean => a > b],
  ['>=', (a: number, b: number): boolean => a >= b],
]);

const evalAll = (nodes: ReadonlyArray<EdnNode>, env: Env, prelude: Prelude): Result<ReadonlyArray<PreludeValue>, EvalIssue> =>
  nodes.reduce<Result<ReadonlyArray<PreludeValue>, EvalIssue>>((acc, node) => {
    if (isErr(acc)) return acc;
    const r = evaluate(node, env, prelude);
    return isErr(r) ? err(r.error) : ok([...acc.value, r.value]);
  }, ok([]));

const bool = (v: boolean): EvalResult => ok({ k: 'bool', v });

const allBool = (args: ReadonlyArray<PreludeValue>): ReadonlyArray<boolean> | undefined =>
  args.every((x) => x.k === 'bool') ? args.map((x) => x.k === 'bool' && x.v) : undefined;

const compareChain = (op: string, compare: Comparison, args: ReadonlyArray<PreludeValue>): EvalResult => {
  const ms = args.map(magnitudeOf);
  const [first, ...rest] = ms;
  if (first === undefined || rest.length === 0 || ms.some((m) => m === undefined || m.unit !== first.unit)) {
    return typeErr(`${op} needs numbers or quantities of one unit`);
  }
  return bool(rest.every((m, i) => m !== undefined && compare((ms[i] ?? first).v, m.v)));
};

const membership = (args: ReadonlyArray<PreludeValue>): EvalResult => {
  const [a, b] = args;
  return a !== undefined && b !== undefined && (b.k === 'set' || b.k === 'seq')
    ? bool(b.items.some((x) => equal(a, x)))
    : typeErr('in? needs a value and a set or vector');
};

const stringify = (args: ReadonlyArray<PreludeValue>): EvalResult =>
  ok({ k: 'str', v: args.map((x) => (x.k === 'str' || x.k === 'kw' ? x.v : x.k === 'num' ? String(x.v) : '')).join('') });

type Operator = (args: ReadonlyArray<PreludeValue>) => EvalResult;

const allEqual = (args: ReadonlyArray<PreludeValue>): boolean => {
  const [a] = args;
  return a !== undefined && args.every((x) => equal(a, x));
};

const OPERATORS: ReadonlyMap<string, Operator> = intoMap<string, Operator>([
  ['=', (args): EvalResult => bool(allEqual(args))],
  ['not=', (args): EvalResult => bool(!allEqual(args))],
  ['in?', membership],
  ['and', (args): EvalResult => { const bs = allBool(args); return bs !== undefined ? bool(bs.every(Boolean)) : typeErr('and needs booleans'); }],
  ['or', (args): EvalResult => { const bs = allBool(args); return bs !== undefined ? bool(bs.some(Boolean)) : typeErr('or needs booleans'); }],
  ['not', (args): EvalResult => { const bs = allBool(args); return bs?.length === 1 ? bool(bs[0] !== true) : typeErr('not needs one boolean'); }],
  ['str', stringify],
]);

const applyOperator = (op: string, args: ReadonlyArray<PreludeValue>): EvalResult => {
  const compare = COMPARE.get(op);
  if (compare !== undefined) return compareChain(op, compare, args);
  const operator = OPERATORS.get(op);
  return operator !== undefined
    ? operator(args)
    : typeErr(`${op} is a prelude form but not a predicate; it cannot be evaluated to a value here`);
};

const keywordLookup = (key: string, argNodes: ReadonlyArray<EdnNode>, ctx: { readonly env: Env; readonly prelude: Prelude }): EvalResult => {
  const target = evalAll(argNodes, ctx.env, ctx.prelude);
  if (isErr(target)) return err(target.error);
  const [m] = target.value;
  return m?.k === 'map' ? ok(m.entries.get(key) ?? { k: 'nil' }) : typeErr('keyword lookup needs a map');
};

const evalCall = (call: EdnList, env: Env, prelude: Prelude): EvalResult => {
  const [head, ...argNodes] = call.elements;
  if (head?.type === 'keyword') return keywordLookup(head.value.substring(1), argNodes, { env, prelude });
  const magnitude = argNodes[0];
  if (isUnitForm(call, prelude) && magnitude?.type === 'number') return ok({ k: 'unit', unit: headOf(call), v: magnitude.value });
  const args = evalAll(argNodes, env, prelude);
  return isErr(args) ? err(args.error) : applyOperator(headOf(call), args.value);
};

const evalMap = (entries: ReadonlyMap<string, EdnNode>, env: Env, prelude: Prelude): EvalResult => {
  const keys = Array.from(entries.keys());
  const values = evalAll(Array.from(entries.values()), env, prelude);
  return isErr(values)
    ? err(values.error)
    : ok({ k: 'map', entries: intoMap(keys.map((key, i) => [key, values.value[i] ?? { k: 'nil' }] as const)) });
};

const evalList = (list: EdnList, env: Env, prelude: Prelude): EvalResult => {
  if (isCall(list)) return evalCall(list, env, prelude);
  const items = evalAll(list.elements, env, prelude);
  return isErr(items) ? err(items.error) : ok({ k: list.delimiter === 'set' ? 'set' : 'seq', items: items.value });
};

const lookupSymbol = (name: string, env: Env): EvalResult => {
  const bound = fromNullable(env.get(name));
  return isSome(bound) ? ok(bound.value) : err({ kind: 'unbound', name });
};

/**
 * Evaluate a prelude expression against bound values.
 *
 * @param node - The expression; free variables name fields of the value under test.
 * @param env - Values for free variables.
 * @param prelude - The prelude in use.
 * @returns The value, or why it cannot be evaluated deterministically.
 */
export const evaluate = (node: EdnNode, env: Env, prelude: Prelude): EvalResult => {
  const heads = semanticHeads(node, prelude);
  if (heads.length > 0) return err({ kind: 'semantic', heads });
  const lit = literal(node);
  if (lit !== undefined) return ok(lit);
  if (node.type === 'symbol') return lookupSymbol(node.value, env);
  if (node.type === 'map') return evalMap(node.entries, env, prelude);
  return node.type === 'list' ? evalList(node, env, prelude) : typeErr('unsupported expression');
};

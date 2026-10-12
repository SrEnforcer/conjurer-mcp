/**
 * Evaluation of prelude expressions (core grimoire, Part V) against bindings.
 *
 * Literals, unit forms, predicates and keyword access are evaluated. Type
 * forms and expansion forms are classified by prelude.ts but not evaluated
 * here. A semantic head is reported, never guessed.
 */
import { ok, err, isErr, isDefined, intoMap } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import type { EdnNode, EdnList, EdnMap } from './edn-parser.js';
import type { Prelude, HeadKind } from './prelude.js';
import { headKind, isCall } from './prelude.js';

export type Value =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'keyword'; readonly value: string }
  | { readonly kind: 'nil' }
  | { readonly kind: 'unit'; readonly unit: string; readonly magnitude: number }
  | { readonly kind: 'vector'; readonly items: ReadonlyArray<Value> }
  | { readonly kind: 'set'; readonly items: ReadonlyArray<Value> }
  | { readonly kind: 'map'; readonly entries: ReadonlyArray<readonly [string, Value]> };

export type EvalErrorKind = 'semantic' | 'unbound' | 'not-evaluated' | 'type-error';

export type EvalError = {
  readonly kind: EvalErrorKind;
  readonly message: string;
  readonly line: number;
  readonly column: number;
};

/** Bindings for free variables, keyed by name; each value is itself a prelude expression. */
export type Bindings = ReadonlyMap<string, EdnNode>;

type R = Result<Value, EvalError>;
type Env = { readonly prelude: Prelude; readonly bindings: Bindings };

const fail = (kind: EvalErrorKind, message: string, at: EdnNode): R =>
  err({ kind, message, line: at.line, column: at.column });

const NIL: Value = { kind: 'nil' };
const NO_BINDINGS: Bindings = intoMap([]);
const bool = (value: boolean): Value => ({ kind: 'boolean', value });

// ── Printing ─────────────────────────────────────────────────────────────────

/**
 * Print a value as EDN.
 *
 * @param v - The value.
 * @returns Its EDN text; set members are sorted so equal sets print equally.
 */
export const printValue = (v: Value): string => {
  switch (v.kind) {
    case 'string': return JSON.stringify(v.value);
    case 'number': return String(v.value);
    case 'boolean': return String(v.value);
    case 'keyword': return v.value;
    case 'nil': return 'nil';
    case 'unit': return `(${v.unit} ${String(v.magnitude)})`;
    case 'vector': return `[${v.items.map(printValue).join(' ')}]`;
    case 'set': return `#{${v.items.map(printValue).sort().join(' ')}}`;
    case 'map': return `{${v.entries.map(([k, x]) => `:${k} ${printValue(x)}`).join(' ')}}`;
  }
};

const equal = (a: Value, b: Value): boolean => printValue(a) === printValue(b);

// ── Evaluation ───────────────────────────────────────────────────────────────
// Every helper recurses through evalNode, defined last; calls happen only after
// the module has loaded.

const evalAll = (nodes: ReadonlyArray<EdnNode>, env: Env): Result<ReadonlyArray<Value>, EvalError> =>
  nodes.reduce<Result<ReadonlyArray<Value>, EvalError>>((acc, n) => {
    if (isErr(acc)) return acc;
    const r = evalNode(n, env);
    return isErr(r) ? err(r.error) : ok([...acc.value, r.value]);
  }, ok([]));

const evalMap = (m: EdnMap, env: Env): R => {
  const keys = Array.from(m.entries.keys());
  const vals = evalAll(Array.from(m.entries.values()), env);
  if (isErr(vals)) return err(vals.error);
  return ok({ kind: 'map', entries: keys.map((k, i): readonly [string, Value] => [k, vals.value[i] ?? NIL]) });
};

const evalSeq = (n: EdnList, env: Env): R => {
  const items = evalAll(n.elements, env);
  if (isErr(items)) return err(items.error);
  return ok(n.delim === 'set' ? { kind: 'set', items: items.value } : { kind: 'vector', items: items.value });
};

const evalSymbol = (n: EdnNode & { readonly type: 'symbol' }, env: Env): R => {
  const bound = env.bindings.get(n.value);
  // Bindings never refer to each other: a bound expression is evaluated without bindings.
  return isDefined(bound)
    ? evalNode(bound, { prelude: env.prelude, bindings: NO_BINDINGS })
    : fail('unbound', `No binding for '${n.value}'`, n);
};

type Ordered = { readonly a: number; readonly b: number };

const ordered = (x: Value, y: Value): Ordered | undefined => {
  if (x.kind === 'number' && y.kind === 'number') return { a: x.value, b: y.value };
  if (x.kind === 'unit' && y.kind === 'unit' && x.unit === y.unit) return { a: x.magnitude, b: y.magnitude };
  return undefined;
};

const COMPARE: Readonly<Record<string, (o: Ordered) => boolean>> = {
  '<': (o) => o.a < o.b,
  '<=': (o) => o.a <= o.b,
  '>': (o) => o.a > o.b,
  '>=': (o) => o.a >= o.b,
};

type Op = { readonly op: string; readonly args: ReadonlyArray<Value>; readonly at: EdnNode };

const compare = ({ op, args, at }: Op): R => {
  const [x, y] = args;
  const test = COMPARE[op];
  if (!isDefined(x) || !isDefined(y) || args.length !== 2 || !isDefined(test)) return fail('type-error', `${op} takes two arguments`, at);
  const o = ordered(x, y);
  return isDefined(o) ? ok(bool(test(o))) : fail('type-error', `Cannot compare ${printValue(x)} with ${printValue(y)}`, at);
};

const member = ({ args, at }: Op): R => {
  const [x, coll] = args;
  if (!isDefined(x) || !isDefined(coll) || (coll.kind !== 'vector' && coll.kind !== 'set')) {
    return fail('type-error', 'in? takes a value and a vector or set', at);
  }
  return ok(bool(coll.items.some((item) => equal(item, x))));
};

const negate = ({ args, at }: Op): R => {
  const [x] = args;
  return isDefined(x) && x.kind === 'boolean' && args.length === 1 ? ok(bool(!x.value)) : fail('type-error', 'not takes one boolean', at);
};

const equality = ({ op, args, at }: Op): R => {
  const [x, y] = args;
  return isDefined(x) && isDefined(y) && args.length === 2
    ? ok(bool(equal(x, y) === (op === '=')))
    : fail('type-error', `${op} takes two arguments`, at);
};

const EAGER: Readonly<Record<string, (o: Op) => R>> = {
  'in?': member,
  'not': negate,
  '=': equality,
  'not=': equality,
};

/** `and` and `or` short-circuit, left to right, over booleans. */
const logical = (op: 'and' | 'or', args: ReadonlyArray<EdnNode>, env: Env): R => {
  const stopAt = op === 'or';
  const step = (rest: ReadonlyArray<EdnNode>): R => {
    const [first, ...more] = rest;
    if (!isDefined(first)) return ok(bool(!stopAt));
    const r = evalNode(first, env);
    if (isErr(r)) return r;
    if (r.value.kind !== 'boolean') return fail('type-error', `${op} takes booleans, got ${printValue(r.value)}`, first);
    return r.value.value === stopAt ? r : step(more);
  };
  return step(args);
};

const predicate = (form: EdnList, op: string, env: Env): R => {
  const args = form.elements.slice(1);
  if (op === 'and' || op === 'or') return logical(op, args, env);
  const vals = evalAll(args, env);
  if (isErr(vals)) return err(vals.error);
  const eager = EAGER[op] ?? compare;
  return eager({ op, args: vals.value, at: form });
};

const access = (form: EdnList, env: Env): R => {
  const [k, target] = form.elements;
  if (!isDefined(k) || k.type !== 'keyword' || !isDefined(target)) return fail('type-error', 'Keyword access takes one value', form);
  const v = evalNode(target, env);
  if (isErr(v)) return v;
  if (v.value.kind !== 'map') return fail('type-error', `${k.value} looks up a key in a map, got ${printValue(v.value)}`, form);
  const hit = v.value.entries.find(([key]) => key === k.value.substring(1));
  return ok(isDefined(hit) ? hit[1] : NIL);
};

const strPart = (v: Value): string => {
  if (v.kind === 'string') return v.value;
  return v.kind === 'nil' ? '' : printValue(v);
};

const concat = (form: EdnList, env: Env): R => {
  const parts = evalAll(form.elements.slice(1), env);
  return isErr(parts) ? err(parts.error) : ok({ kind: 'string', value: parts.value.map(strPart).join('') });
};

const unit = (form: EdnList, name: string): R => {
  const magnitude = form.elements[1];
  return isDefined(magnitude) && magnitude.type === 'number'
    ? ok({ kind: 'unit', unit: name, magnitude: magnitude.value })
    : fail('type-error', `Unit form '${name}' takes one number`, form);
};

const headText = (form: EdnList): string => {
  const head = form.elements[0];
  return isDefined(head) && (head.type === 'symbol' || head.type === 'keyword') ? head.value : '';
};

const notEvaluated = (form: EdnList, name: string, kind: HeadKind): R =>
  kind === 'type' || kind === 'expansion'
    ? fail('not-evaluated', `'${name}' is a prelude ${kind} form; it is classified, not evaluated`, form)
    : fail('semantic', `'${name}' is not in the prelude; it is a semantic function for the model`, form);

const call = (form: EdnList, env: Env): R => {
  const kind = headKind(form, env.prelude, []);
  const name = headText(form);
  if (kind === 'predicate') return predicate(form, name, env);
  if (kind === 'access') return access(form, env);
  if (kind === 'unit') return unit(form, name);
  if (kind === 'expansion' && name === 'str') return concat(form, env);
  return notEvaluated(form, name, kind);
};

const scalar = (n: EdnNode): Value | undefined => {
  switch (n.type) {
    case 'string': return { kind: 'string', value: n.value };
    case 'number': return { kind: 'number', value: n.value };
    case 'boolean': return bool(n.value);
    case 'keyword': return { kind: 'keyword', value: n.value };
    case 'nil': return NIL;
    case 'symbol':
    case 'list':
    case 'map': return undefined;
  }
};

function evalNode(n: EdnNode, env: Env): R {
  const v = scalar(n);
  if (isDefined(v)) return ok(v);
  if (n.type === 'symbol') return evalSymbol(n, env);
  if (n.type === 'map') return evalMap(n, env);
  if (n.type !== 'list') return fail('type-error', 'Unknown form', n);
  return isCall(n) ? call(n, env) : evalSeq(n, env);
}

/**
 * Evaluate a prelude expression.
 *
 * @param node - The expression.
 * @param prelude - The prelude in force.
 * @param bindings - Values for its free variables.
 * @returns The value, or the first reason it cannot be evaluated deterministically.
 */
export const evaluateExpression = (node: EdnNode, prelude: Prelude, bindings: Bindings): Result<Value, EvalError> =>
  evalNode(node, { prelude, bindings });

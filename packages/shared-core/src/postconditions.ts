/**
 * `ensure` postconditions checked at the MCP layer (core.md · ensure; Part V · The prelude).
 *
 * A structural predicate written in the prelude is evaluated deterministically against the
 * proposed artefact's values. Any other predicate is a semantic function: it is reported as
 * such, never evaluated, so `:verify-via :mcp` is only claimed where it can be honoured.
 *
 * Pure — no I/O.
 */
import { isErr, intoMap, absurd } from '@tsfpp/prelude';
import type { EdnNode, EdnList } from './edn-parser.js';
import { evaluate, semanticHeads } from './prelude.js';
import type { Prelude, PreludeValue, EvalIssue } from './prelude.js';

/** An `ensure` form and the top-level form it belongs to. */
export type EnsureSite = {
  readonly owner: string;
  readonly structural: ReadonlyArray<EdnNode>;
  readonly verifyVia: ReadonlyArray<string>;
  readonly line: number;
};

/** The outcome of checking one structural predicate. */
export type PredicateOutcome = {
  readonly predicate: string;
  readonly status: 'pass' | 'fail' | 'semantic' | 'unbound' | 'error';
  readonly detail: string;
};

/** JSON values accepted for an artefact's fields; `{unit, magnitude}` denotes a quantity. */
export type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };

const printList = (list: EdnList): string => {
  const inner = list.elements.map(printEdn).join(' ');
  if (list.delimiter === 'vector') return `[${inner}]`;
  return list.delimiter === 'set' ? `#{${inner}}` : `(${inner})`;
};

/**
 * Render an EDN node as compact source text, for reports.
 *
 * @param node - Any node.
 * @returns Source text.
 */
export const printEdn = (node: EdnNode): string => {
  switch (node.type) {
    case 'string': return JSON.stringify(node.value);
    case 'number':
    case 'boolean': return String(node.value);
    case 'nil': return 'nil';
    case 'keyword':
    case 'symbol': return node.value;
    case 'map': return `{${Array.from(node.entries.entries()).map(([k, v]) => `:${k} ${printEdn(v)}`).join(' ')}}`;
    case 'list': return printList(node);
    default: return absurd(node);
  }
};

const isCallTo = (node: EdnNode, head: string): node is EdnList =>
  node.type === 'list' && node.delimiter === undefined && node.elements[0]?.type === 'symbol' && node.elements[0].value === head;

const pairsOf = (call: EdnList): ReadonlyMap<string, EdnNode> =>
  intoMap(call.elements.slice(1).flatMap((el, i, rest) => {
    const value = rest[i + 1];
    return el.type === 'keyword' && value !== undefined ? [[el.value.substring(1), value] as const] : [];
  }));

const ownerOf = (form: EdnNode): string => {
  if (form.type !== 'list') return '(form)';
  const [head, name] = form.elements;
  const headText = head !== undefined ? printEdn(head) : '';
  return name !== undefined && (name.type === 'symbol' || name.type === 'keyword' || name.type === 'string')
    ? `${headText}:${printEdn(name)}`
    : headText;
};

const collectEnsures = (node: EdnNode): ReadonlyArray<EdnList> => {
  if (node.type === 'map') return Array.from(node.entries.values()).flatMap(collectEnsures);
  if (node.type !== 'list') return [];
  const nested = node.elements.flatMap(collectEnsures);
  return isCallTo(node, 'ensure') ? [node, ...nested] : nested;
};

const vectorItems = (node: EdnNode | undefined): ReadonlyArray<EdnNode> =>
  node !== undefined && node.type === 'list' ? node.elements : [];

/**
 * Find every `ensure` form, at any depth, with its structural predicates and layers.
 *
 * @param forms - Top-level forms of a `.cnj` file or a snippet.
 * @returns One site per `ensure`, attributed to its top-level form.
 */
export const findEnsureSites = (forms: ReadonlyArray<EdnNode>): ReadonlyArray<EnsureSite> =>
  forms.flatMap((form) => collectEnsures(form).map((ensure) => {
    const pairs = pairsOf(ensure);
    return {
      owner: ownerOf(form),
      structural: vectorItems(pairs.get('structural')),
      verifyVia: vectorItems(pairs.get('verify-via')).map((n) => (n.type === 'keyword' ? n.value.substring(1) : printEdn(n))),
      line: ensure.line,
    };
  }));

const isObject = (v: JsonValue): v is { readonly [key: string]: JsonValue } =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const fromJsonObject = (v: { readonly [key: string]: JsonValue }): PreludeValue => {
  const unit = v['unit'];
  const magnitude = v['magnitude'];
  if (typeof unit === 'string' && typeof magnitude === 'number' && Object.keys(v).length === 2) return { k: 'unit', unit, v: magnitude };
  return { k: 'map', entries: intoMap(Object.entries(v).map(([key, value]) => [key, fromJson(value)] as const)) };
};

/**
 * Convert a JSON value to a prelude value: strings starting with `:` are keywords, arrays are
 * vectors, `{unit, magnitude}` is a quantity, other objects are maps.
 *
 * @param v - The JSON value.
 * @returns The prelude value.
 */
export const fromJson = (v: JsonValue): PreludeValue => {
  if (v === null) return { k: 'nil' };
  if (typeof v === 'boolean') return { k: 'bool', v };
  if (typeof v === 'number') return { k: 'num', v };
  if (typeof v === 'string') return v.startsWith(':') ? { k: 'kw', v: v.substring(1) } : { k: 'str', v };
  if (Array.isArray(v)) return { k: 'seq', items: v.map(fromJson) };
  return isObject(v) ? fromJsonObject(v) : { k: 'nil' };
};

const issueOutcome = (issue: EvalIssue): Omit<PredicateOutcome, 'predicate'> => {
  switch (issue.kind) {
    case 'semantic': return { status: 'semantic', detail: `semantic function ${issue.heads.join(', ')}: enforced at the :llm layer, not checked here` };
    case 'unbound': return { status: 'unbound', detail: `no value supplied for '${issue.name}'` };
    case 'type': return { status: 'error', detail: issue.message };
    default: return absurd(issue);
  }
};

/**
 * Check one structural predicate against an artefact's values.
 *
 * @param predicate - The predicate expression.
 * @param values - The artefact's fields, by name.
 * @param prelude - The prelude in use.
 * @returns pass or fail when evaluable; otherwise why not.
 */
export const checkPredicate = (
  predicate: EdnNode,
  values: ReadonlyMap<string, PreludeValue>,
  prelude: Prelude,
): PredicateOutcome => {
  const text = printEdn(predicate);
  const result = evaluate(predicate, values, prelude);
  if (isErr(result)) return { predicate: text, ...issueOutcome(result.error) };
  const value = result.value;
  if (value.k !== 'bool') return { predicate: text, status: 'error', detail: 'does not evaluate to a boolean' };
  return { predicate: text, status: value.v ? 'pass' : 'fail', detail: value.v ? 'holds' : 'does not hold' };
};

/**
 * Structural predicates that claim `:mcp` verification but use a semantic function.
 *
 * @param sites - Ensure sites of a document.
 * @param prelude - The prelude in use.
 * @returns For each such predicate, its owner, text and the semantic heads it uses.
 */
export const unverifiableAtMcp = (
  sites: ReadonlyArray<EnsureSite>,
  prelude: Prelude,
): ReadonlyArray<{ readonly owner: string; readonly predicate: string; readonly heads: ReadonlyArray<string> }> =>
  sites
    .filter((site) => site.verifyVia.includes('mcp'))
    .flatMap((site) => site.structural.flatMap((predicate) => {
      const heads = semanticHeads(predicate, prelude);
      return heads.length > 0 ? [{ owner: site.owner, predicate: printEdn(predicate), heads }] : [];
    }));

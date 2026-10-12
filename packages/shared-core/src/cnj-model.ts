import { ok, err, intoMap, isSome, fromNullable } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import type { EdnNode } from './edn-parser.js';
import { bareName } from './references.js';

export type Charter = {
  readonly title: string;
  readonly version: string;
  readonly goals: ReadonlyArray<string>;
  readonly decisions: ReadonlyArray<ReadonlyMap<string, EdnNode>>;
  readonly open: ReadonlyArray<string>;
  readonly references: ReadonlyArray<string>;
  readonly outputs: ReadonlyMap<string, EdnNode>;
  readonly audience: ReadonlyMap<string, EdnNode>;
};

export type CnjAsset = {
  readonly name: string;
  readonly type: string;
  readonly appliesTo: ReadonlyArray<string>;
};

export type CnjTarget = {
  readonly name: string;
  readonly language: string;
  readonly standard: string;
  readonly produces: ReadonlyArray<string>;
  readonly modules: ReadonlyArray<ReadonlyMap<string, EdnNode>>;
  readonly from?: string;
};

export type CnjDomainForm = {
  readonly formType: string;
  readonly name: string;
  readonly requires: ReadonlyArray<string>;
  readonly forbids: ReadonlyArray<string>;
  readonly prefers: ReadonlyArray<string>;
  readonly style: ReadonlyArray<string>;
  readonly deferred: ReadonlyArray<string>;
  readonly manifest: ReadonlyArray<string>;
};

export type CnjReassessment = {
  readonly of: string;
  readonly date: string;
  readonly scores: ReadonlyMap<string, number>;
  readonly rationale: string;
  readonly status: string;
};

export type CnjHoist = {
  readonly of: string;
  readonly date: string;
  readonly into: string;
  readonly outcomes: ReadonlyArray<string>;
  readonly note: string;
};

export type CnjCandidateForm = {
  readonly id: string;
  readonly label: string;
  readonly cluster: string;
  readonly status: string;
  readonly scores: ReadonlyMap<string, number>;
  readonly rationale: string;
  readonly conditions: ReadonlyArray<string>;
  readonly added: string;
  readonly history: ReadonlyArray<CnjReassessment>;
};

export type CnjDocument = {
  readonly charter: Charter;
  readonly assets: ReadonlyArray<CnjAsset>;
  readonly targets: ReadonlyArray<CnjTarget>;
  readonly domainForms: ReadonlyArray<CnjDomainForm>;
  readonly candidates: ReadonlyArray<CnjCandidateForm>;
  readonly hoists: ReadonlyArray<CnjHoist>;
  readonly sourceFile: string;
};

const nodeStr = (n: EdnNode): string => {
  if (n.type === 'string') return n.value;
  if (n.type === 'keyword') return n.value.substring(1);
  if (n.type === 'symbol') return n.value;
  return '';
};

const nodeStrList = (n: EdnNode): ReadonlyArray<string> => {
  if (n.type === 'list') return n.elements.map(nodeStr).filter((s) => s.length > 0);
  if (n.type === 'string' || n.type === 'keyword' || n.type === 'symbol') return [nodeStr(n)];
  return [];
};

const collectKV = (
  elems: ReadonlyArray<EdnNode>, i: number, acc: ReadonlyArray<readonly [string, EdnNode]>,
): ReadonlyArray<readonly [string, EdnNode]> => {
  const key = fromNullable(elems[i]);
  const val = fromNullable(elems[i + 1]);
  if (!isSome(key) || !isSome(val) || key.value.type !== 'keyword') return acc;
  return collectKV(elems, i + 2, [...acc, [key.value.value.substring(1), val.value]]);
};

const kvMap = (elems: ReadonlyArray<EdnNode>, start: number): ReadonlyMap<string, EdnNode> =>
  intoMap(collectKV(elems, start, []));

const getNode = (m: ReadonlyMap<string, EdnNode>, key: string): EdnNode | undefined =>
  m.get(key);

const getStr = (m: ReadonlyMap<string, EdnNode>, key: string): string => {
  const n = getNode(m, key);
  return n !== undefined ? nodeStr(n) : '';
};

const getList = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyArray<string> => {
  const n = getNode(m, key);
  return n !== undefined ? nodeStrList(n) : [];
};

const getEdnList = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyArray<EdnNode> => {
  const n = getNode(m, key);
  return n !== undefined && n.type === 'list' ? n.elements : [];
};

const getMaps = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyArray<ReadonlyMap<string, EdnNode>> =>
  getEdnList(m, key).flatMap((n) => (n.type === 'map' ? [n.entries] : []));

const getMap = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyMap<string, EdnNode> => {
  const n = getNode(m, key);
  return n !== undefined && n.type === 'map' ? n.entries : intoMap([]);
};

const getScores = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyMap<string, number> => {
  const n = getNode(m, key);
  if (n === undefined || n.type !== 'map') return intoMap([]);
  return intoMap(
    Array.from(n.entries.entries()).flatMap(([k, v]) =>
      v.type === 'number' ? [[k, v.value] as const] : [],
    ),
  );
};

const parseCharter = (elems: ReadonlyArray<EdnNode>): Charter => {
  const titleNode = fromNullable(elems[1]);
  const title = isSome(titleNode) ? nodeStr(titleNode.value) : '';
  const kv = kvMap(elems, 2);
  return {
    title,
    version: getStr(kv, 'version'),
    goals: getList(kv, 'goals'),
    decisions: getMaps(kv, 'decisions'),
    open: getList(kv, 'open'),
    references: getList(kv, 'references'),
    outputs: getMap(kv, 'outputs'),
    audience: getMap(kv, 'audience'),
  };
};

const parseAsset = (elems: ReadonlyArray<EdnNode>): CnjAsset | undefined => {
  const nameNode = fromNullable(elems[1]);
  if (!isSome(nameNode)) return undefined;
  const name = nodeStr(nameNode.value);
  if (name.length === 0) return undefined;
  const kv = kvMap(elems, 2);
  return {
    name,
    type: getStr(kv, 'type'),
    appliesTo: getList(kv, 'applies-to'),
  };
};

const parseTarget = (elems: ReadonlyArray<EdnNode>): CnjTarget | undefined => {
  const nameNode = fromNullable(elems[1]);
  if (!isSome(nameNode)) return undefined;
  const name = nodeStr(nameNode.value);
  if (name.length === 0) return undefined;
  const kv = kvMap(elems, 2);
  const from = bareName(getStr(kv, 'from'));
  return {
    name,
    language: getStr(kv, 'language'),
    standard: getStr(kv, 'standard'),
    produces: getList(kv, 'produces'),
    modules: getMaps(kv, 'modules'),
    ...(from.length > 0 ? { from } : {}),
  };
};

const formName = (elems: ReadonlyArray<EdnNode>): string => {
  const head = fromNullable(elems[0]);
  return isSome(head) && head.value.type === 'symbol' ? head.value.value : '';
};

const parseReassess = (elems: ReadonlyArray<EdnNode>): CnjReassessment | undefined => {
  // (f/reassess :of IDENTIFIER :date "..." ...) — :of is syntactic; kv starts at index 1
  const kv = kvMap(elems, 1);
  const of_ = getStr(kv, 'of');
  if (of_.length === 0) return undefined;
  return {
    of: of_,
    date: getStr(kv, 'date'),
    scores: getScores(kv, 'scores'),
    rationale: getStr(kv, 'rationale'),
    status: getStr(kv, 'status'),
  };
};

const getHistory = (m: ReadonlyMap<string, EdnNode>, key: string): ReadonlyArray<CnjReassessment> => {
  const n = getNode(m, key);
  if (n === undefined || n.type !== 'list') return [];
  return n.elements.flatMap((item) => {
    if (item.type !== 'list' || item.elements.length === 0) return [];
    const head = fromNullable(item.elements[0]);
    if (!isSome(head) || head.value.type !== 'symbol' || head.value.value !== 'f/reassess') return [];
    const r = parseReassess(item.elements);
    return r !== undefined ? [r] : [];
  });
};

const parseCandidate = (elems: ReadonlyArray<EdnNode>): CnjCandidateForm | undefined => {
  const idNode = fromNullable(elems[1]);
  if (!isSome(idNode)) return undefined;
  const id = nodeStr(idNode.value);
  if (id.length === 0) return undefined;
  const kv = kvMap(elems, 2);
  return {
    id,
    label: getStr(kv, 'label'),
    cluster: getStr(kv, 'cluster'),
    status: getStr(kv, 'status'),
    scores: getScores(kv, 'scores'),
    rationale: getStr(kv, 'rationale'),
    conditions: getList(kv, 'conditions'),
    added: getStr(kv, 'added'),
    history: getHistory(kv, 'history'),
  };
};

const parseHoist = (elems: ReadonlyArray<EdnNode>): CnjHoist | undefined => {
  // (f/hoist :of IDENTIFIER :date "..." ...) — :of is syntactic; kv starts at index 1
  const kv = kvMap(elems, 1);
  const of_ = getStr(kv, 'of');
  if (of_.length === 0) return undefined;
  return {
    of: of_,
    date: getStr(kv, 'date'),
    into: getStr(kv, 'into'),
    outcomes: getList(kv, 'outcomes'),
    note: getStr(kv, 'note'),
  };
};

const parseDomainForm = (elems: ReadonlyArray<EdnNode>): CnjDomainForm | undefined => {
  const head = fromNullable(elems[0]);
  if (!isSome(head) || head.value.type !== 'symbol') return undefined;
  const nameNode = fromNullable(elems[1]);
  const name = isSome(nameNode) ? nodeStr(nameNode.value) : '';
  const kv = kvMap(elems, 2);
  return {
    formType: head.value.value,
    name,
    requires: getList(kv, 'requires'),
    forbids: getList(kv, 'forbids'),
    prefers: getList(kv, 'prefers'),
    style: getList(kv, 'style'),
    deferred: getList(kv, 'deferred'),
    manifest: getList(kv, 'manifest'),
  };
};

type FormAcc = {
  readonly charter: Charter | undefined;
  readonly assets: ReadonlyArray<CnjAsset>;
  readonly targets: ReadonlyArray<CnjTarget>;
  readonly domainForms: ReadonlyArray<CnjDomainForm>;
  readonly candidates: ReadonlyArray<CnjCandidateForm>;
  readonly hoists: ReadonlyArray<CnjHoist>;
};

const appendIfDefined = <T>(
  items: ReadonlyArray<T>,
  next: T | undefined,
): ReadonlyArray<T> => (next !== undefined ? [...items, next] : items);

const updateAccForForm = (
  acc: FormAcc,
  elements: ReadonlyArray<EdnNode>,
  form: string,
): FormAcc => {
  switch (form) {
    case 'charter':
      return { ...acc, charter: parseCharter(elements) };
    case 'asset':
      return { ...acc, assets: appendIfDefined(acc.assets, parseAsset(elements)) };
    case 'target':
      return { ...acc, targets: appendIfDefined(acc.targets, parseTarget(elements)) };
    case 'f/candidate':
      return { ...acc, candidates: appendIfDefined(acc.candidates, parseCandidate(elements)) };
    case 'f/hoist':
      return { ...acc, hoists: appendIfDefined(acc.hoists, parseHoist(elements)) };
    default: {
      const domainForm = parseDomainForm(elements);
      return domainForm !== undefined
        ? { ...acc, domainForms: [...acc.domainForms, domainForm] }
        : acc;
    }
  }
};

const processForms = (
  nodes: ReadonlyArray<EdnNode>,
  acc: FormAcc,
  i: number,
): FormAcc => {
  const node = fromNullable(nodes[i]);
  if (!isSome(node)) return acc;
  const n = node.value;
  if (n.type !== 'list') return processForms(nodes, acc, i + 1);
  return processForms(nodes, updateAccForForm(acc, n.elements, formName(n.elements)), i + 1);
};

const defaultCharter: Charter = {
  title: '',
  version: '',
  goals: [],
  decisions: [],
  open: [],
  references: [],
  outputs: intoMap([]),
  audience: intoMap([]),
};

export const toCnjModel = (
  nodes: ReadonlyArray<EdnNode>,
  sourceFile: string,
): Result<CnjDocument, string> => {
  if (nodes.length === 0) return err('Empty .cnj file');
  const initial: FormAcc = { charter: undefined, assets: [], targets: [], domainForms: [], candidates: [], hoists: [] };
  const result = processForms(nodes, initial, 0);
  return ok({
    charter: result.charter ?? defaultCharter,
    assets: result.assets,
    targets: result.targets,
    domainForms: result.domainForms,
    candidates: result.candidates,
    hoists: result.hoists,
    sourceFile,
  });
};

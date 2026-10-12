import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ok, err, none, some, isSome, isErr, intoMap, fromNullable } from '@tsfpp/prelude';
import type { Result, Option } from '@tsfpp/prelude';
import type { SymbolRecord, GrimoireRef } from './types.js';
import type { EdnNode, EdnMap } from './edn-parser.js';
import { parse } from './edn-parser.js';
import type { SpecReader } from './spec-reader.js';
import { parsePrelude } from './prelude.js';
import type { Prelude } from './prelude.js';

export type SymbolIndex = {
  readonly symbols: ReadonlyMap<string, SymbolRecord>;
  readonly grimoires: ReadonlyMap<string, GrimoireRef>;
  /** The expression prelude from `index.edn` `:prelude`; absent for specs that predate it. */
  readonly prelude?: Prelude;
};

export type SearchOptions = {
  readonly query: string;
  readonly grimoire?: string;
  readonly limit?: number;
};

const getStr = (m: EdnMap, key: string): Option<string> => {
  const v = fromNullable(m.entries.get(key));
  if (!isSome(v)) return none;
  const n = v.value;
  if (n.type === 'string') return some(n.value);
  if (n.type === 'keyword') return some(n.value.substring(1));
  if (n.type === 'symbol') return some(n.value);
  return none;
};

const getStrList = (m: EdnMap, key: string): ReadonlyArray<string> => {
  const v = fromNullable(m.entries.get(key));
  if (!isSome(v) || v.value.type !== 'list') return [];
  return v.value.elements
    .filter((n): n is { readonly type: 'keyword'; readonly value: string; readonly line: number; readonly column: number } => n.type === 'keyword')
    .map((n) => n.value.substring(1));
};

const parseGrimoires = (root: EdnMap): ReadonlyMap<string, GrimoireRef> => {
  const gv = fromNullable(root.entries.get('grimoires'));
  if (!isSome(gv) || gv.value.type !== 'list') return intoMap([]);
  const entries = gv.value.elements.flatMap((n): ReadonlyArray<readonly [string, GrimoireRef]> => {
    if (n.type !== 'map') return [];
    const name = getStr(n, 'name');
    const file = getStr(n, 'file');
    if (!isSome(name) || !isSome(file)) return [];
    const ns = getStr(n, 'namespace');
    return [[name.value, { name: name.value, file: file.value, ...(isSome(ns) ? { namespace: ns.value } : {}) }]];
  });
  return intoMap(entries);
};

const parseSymbol = (
  name: string, n: EdnNode, grimoires: ReadonlyMap<string, GrimoireRef>,
): Option<SymbolRecord> => {
  if (n.type !== 'map') return none;
  const gr = getStr(n, 'grimoire') ?? some('core');
  const grimoire = isSome(gr) ? gr.value : 'core';
  const grimoireRef = fromNullable(grimoires.get(grimoire));
  const synopsis = getStr(n, 'synopsis');
  const keyParams = getStrList(n, 'key-params');
  return some({
    symbol: name,
    grimoire,
    namespace: isSome(grimoireRef) ? (grimoireRef.value.namespace ?? '') : '',
    synopsis: isSome(synopsis) ? synopsis.value : '',
    keyParams,
  });
};

const parseSymbols = (
  root: EdnMap, grimoires: ReadonlyMap<string, GrimoireRef>,
): ReadonlyMap<string, SymbolRecord> => {
  const sv = fromNullable(root.entries.get('symbols'));
  if (!isSome(sv) || sv.value.type !== 'map') return intoMap([]);
  const entries = Array.from(sv.value.entries.entries()).flatMap(([k, v]): ReadonlyArray<readonly [string, SymbolRecord]> => {
    const rec = parseSymbol(k, v, grimoires);
    return isSome(rec) ? [[k, rec.value]] : [];
  });
  return intoMap(entries);
};

export const buildIndex = (reader: SpecReader): Result<SymbolIndex, string> => {
  const indexPath = resolve(reader.specPath, 'index.edn');
  if (!existsSync(indexPath)) return err(`index.edn not found at ${indexPath}`);
  const content = readFileSync(indexPath, 'utf8');
  const parsed = parse(content);
  if (isErr(parsed)) return err(parsed.error.message);
  const root = fromNullable(parsed.value[0]);
  if (!isSome(root) || root.value.type !== 'map') return err('index.edn root must be a map');
  const grimoires = parseGrimoires(root.value);
  const symbols = parseSymbols(root.value, grimoires);
  const preludeNode = root.value.entries.get('prelude');
  return ok({ symbols, grimoires, ...(preludeNode !== undefined ? { prelude: parsePrelude(preludeNode) } : {}) });
};

export const lookup = (index: SymbolIndex, symbolName: string): Option<SymbolRecord> =>
  fromNullable(index.symbols.get(symbolName));

export const search = (index: SymbolIndex, options: SearchOptions): ReadonlyArray<{ readonly symbol: string; readonly grimoire: string; readonly synopsis: string; readonly score: number }> => {
  const q = options.query.toLowerCase();
  return Array.from(index.symbols.values())
    .filter((r) => options.grimoire === undefined || r.grimoire === options.grimoire)
    .map((r) => ({
      symbol: r.symbol,
      grimoire: r.grimoire,
      synopsis: r.synopsis,
      score: (r.symbol.toLowerCase().includes(q) ? 2 : 0) + (r.synopsis.toLowerCase().includes(q) ? 1 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 20);
};

export const listAll = (
  index: SymbolIndex,
  grimoire?: string,
): Result<ReadonlyArray<{ readonly grimoire: string; readonly symbol: string; readonly synopsis: string }>, string> =>
  ok(
    Array.from(index.symbols.values())
      .filter((r) => grimoire === undefined || r.grimoire === grimoire)
      .map((r) => ({ grimoire: r.grimoire, symbol: r.symbol, synopsis: r.synopsis })),
  );

const isUnitShaped = (elements: ReadonlyArray<EdnNode>): boolean => {
  const [head, magnitude, ...rest] = elements;
  return head?.type === 'symbol' && magnitude?.type === 'number' && rest.length === 0 && !head.value.includes('/');
};

const visitSymbolNode = (node: EdnNode, isHead: boolean): ReadonlyArray<string> => {
  if (node.type === 'symbol') {
    // Collect head-position symbols (form type names) and namespaced symbols (spec refs like w/prototype)
    return isHead || node.value.includes('/') ? [node.value] : [];
  }
  if (node.type === 'list') {
    // Only a parenthesised form has a head; a vector or set is data. A unit form such as
    // (eur 10000) — one symbol and one number — names a unit, not a construct.
    const hasHead = node.delimiter === undefined && !isUnitShaped(node.elements);
    return node.elements.flatMap((el, i) => visitSymbolNode(el, i === 0 && hasHead));
  }
  if (node.type === 'map') {
    return Array.from(node.entries.values()).flatMap((v) => visitSymbolNode(v, false));
  }
  return [];
};

export const collectSymbolRefs = (nodes: ReadonlyArray<EdnNode>): ReadonlyArray<string> => {
  const refs = nodes.flatMap((n) => visitSymbolNode(n, false));
  return Array.from(intoMap(refs.map((sym) => [sym, true] as const)).keys());
};

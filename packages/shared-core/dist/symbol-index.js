import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ok, err, none, some, isSome, isErr, intoMap, fromNullable } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
const getStr = (m, key) => {
    const v = fromNullable(m.entries.get(key));
    if (!isSome(v))
        return none;
    const n = v.value;
    if (n.type === 'string')
        return some(n.value);
    if (n.type === 'keyword')
        return some(n.value.substring(1));
    if (n.type === 'symbol')
        return some(n.value);
    return none;
};
const getStrList = (m, key) => {
    const v = fromNullable(m.entries.get(key));
    if (!isSome(v) || v.value.type !== 'list')
        return [];
    return v.value.elements
        .filter((n) => n.type === 'keyword')
        .map((n) => n.value.substring(1));
};
const parseGrimoires = (root) => {
    const gv = fromNullable(root.entries.get('grimoires'));
    if (!isSome(gv) || gv.value.type !== 'list')
        return intoMap([]);
    const entries = gv.value.elements.flatMap((n) => {
        if (n.type !== 'map')
            return [];
        const name = getStr(n, 'name');
        const file = getStr(n, 'file');
        if (!isSome(name) || !isSome(file))
            return [];
        const ns = getStr(n, 'namespace');
        return [[name.value, { name: name.value, file: file.value, ...(isSome(ns) ? { namespace: ns.value } : {}) }]];
    });
    return intoMap(entries);
};
const parseSymbol = (name, n, grimoires) => {
    if (n.type !== 'map')
        return none;
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
const parseSymbols = (root, grimoires) => {
    const sv = fromNullable(root.entries.get('symbols'));
    if (!isSome(sv) || sv.value.type !== 'map')
        return intoMap([]);
    const entries = Array.from(sv.value.entries.entries()).flatMap(([k, v]) => {
        const rec = parseSymbol(k, v, grimoires);
        return isSome(rec) ? [[k, rec.value]] : [];
    });
    return intoMap(entries);
};
export const buildIndex = (reader) => {
    const indexPath = resolve(reader.specPath, 'index.edn');
    if (!existsSync(indexPath))
        return err(`index.edn not found at ${indexPath}`);
    const content = readFileSync(indexPath, 'utf8');
    const parsed = parse(content);
    if (isErr(parsed))
        return err(parsed.error.message);
    const root = fromNullable(parsed.value[0]);
    if (!isSome(root) || root.value.type !== 'map')
        return err('index.edn root must be a map');
    const grimoires = parseGrimoires(root.value);
    const symbols = parseSymbols(root.value, grimoires);
    return ok({ symbols, grimoires });
};
export const lookup = (index, symbolName) => fromNullable(index.symbols.get(symbolName));
export const search = (index, options) => {
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
export const listAll = (index, grimoire) => ok(Array.from(index.symbols.values())
    .filter((r) => grimoire === undefined || r.grimoire === grimoire)
    .map((r) => ({ grimoire: r.grimoire, symbol: r.symbol, synopsis: r.synopsis })));
const visitSymbolNode = (node, isHead) => {
    if (node.type === 'symbol') {
        // Collect head-position symbols (form type names) and namespaced symbols (spec refs like w/prototype)
        return isHead || node.value.includes('/') ? [node.value] : [];
    }
    if (node.type === 'list') {
        return node.elements.flatMap((el, i) => visitSymbolNode(el, i === 0));
    }
    if (node.type === 'map') {
        return Array.from(node.entries.values()).flatMap((v) => visitSymbolNode(v, false));
    }
    return [];
};
export const collectSymbolRefs = (nodes) => {
    const refs = nodes.flatMap((n) => visitSymbolNode(n, false));
    return Array.from(intoMap(refs.map((sym) => [sym, true])).keys());
};
//# sourceMappingURL=symbol-index.js.map
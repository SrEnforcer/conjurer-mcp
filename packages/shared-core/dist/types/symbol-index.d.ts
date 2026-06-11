import type { Result, Option } from '@tsfpp/prelude';
import type { SymbolRecord, GrimoireRef } from './types.js';
import type { EdnNode } from './edn-parser.js';
import type { SpecReader } from './spec-reader.js';
export type SymbolIndex = {
    readonly symbols: ReadonlyMap<string, SymbolRecord>;
    readonly grimoires: ReadonlyMap<string, GrimoireRef>;
};
export type SearchOptions = {
    readonly query: string;
    readonly grimoire?: string;
    readonly limit?: number;
};
export declare const buildIndex: (reader: SpecReader) => Result<SymbolIndex, string>;
export declare const lookup: (index: SymbolIndex, symbolName: string) => Option<SymbolRecord>;
export declare const search: (index: SymbolIndex, options: SearchOptions) => ReadonlyArray<{
    readonly symbol: string;
    readonly grimoire: string;
    readonly synopsis: string;
    readonly score: number;
}>;
export declare const listAll: (index: SymbolIndex, grimoire?: string) => Result<ReadonlyArray<{
    readonly grimoire: string;
    readonly symbol: string;
    readonly synopsis: string;
}>, string>;
export declare const collectSymbolRefs: (nodes: ReadonlyArray<EdnNode>) => ReadonlyArray<string>;
//# sourceMappingURL=symbol-index.d.ts.map
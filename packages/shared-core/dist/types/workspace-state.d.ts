import type { Result } from '@tsfpp/prelude';
import type { CnjDocument } from './cnj-model.js';
export type ParsedFileEntry = {
    readonly path: string;
    readonly content: string;
    readonly doc: CnjDocument;
    readonly directRefs: ReadonlyArray<string>;
};
export type WorkspaceSnapshot = {
    readonly files: ReadonlyMap<string, ParsedFileEntry>;
    readonly targetEdges: ReadonlyMap<string, ReadonlyArray<string>>;
    readonly cycleDetected: boolean;
};
export declare const topoOrder: (snapshot: WorkspaceSnapshot, entryFile: string) => ReadonlyArray<string>;
export declare const computeContextKey: (snapshot: WorkspaceSnapshot, files: ReadonlyArray<string>) => string;
export declare const buildWorkspaceSnapshot: (entryFile: string) => Result<WorkspaceSnapshot, string>;
//# sourceMappingURL=workspace-state.d.ts.map
import type { Result, Option } from '@tsfpp/prelude';
export type SpecReader = {
    readonly specPath: string;
};
export declare const resolveSpecPath: () => Option<string>;
export declare const readGrimoire: (reader: SpecReader, grimoire: string) => Result<string, string>;
export declare const readSection: (reader: SpecReader, grimoire: string, section: string) => Result<string, string>;
//# sourceMappingURL=spec-reader.d.ts.map
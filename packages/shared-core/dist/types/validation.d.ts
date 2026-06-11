import type { CnjDocument } from './cnj-model.js';
import type { SymbolIndex } from './symbol-index.js';
export type ValidationMode = 'authored' | 'recovered';
export type ReferenceStatus = {
    readonly ref: string;
    readonly exists: boolean;
};
export type ValidationOptions = {
    readonly index?: SymbolIndex;
    readonly symbolRefs?: ReadonlyArray<string>;
    readonly referencesStatus?: ReadonlyArray<ReferenceStatus>;
};
export type ValidationRule = {
    readonly id: string;
    readonly description: string;
};
export type Violation = {
    readonly rule: string;
    readonly severity: 'error' | 'warning';
    readonly location: string;
    readonly message: string;
};
export type ValidationReport = {
    readonly valid: boolean;
    readonly mode: ValidationMode;
    readonly violations: ReadonlyArray<Violation>;
};
export declare const checkSymbolUsage: (symbolRefs: ReadonlyArray<string>, index: SymbolIndex) => ReadonlyArray<Violation>;
export declare const checkReferences: (referencesStatus: ReadonlyArray<ReferenceStatus>) => ReadonlyArray<Violation>;
export declare const lintConventions: (doc: CnjDocument) => ReadonlyArray<Violation>;
export declare const VALIDATION_RULE_DESCRIPTIONS: Readonly<Record<string, ReadonlyArray<string>>>;
export declare const validateCnj: (doc: CnjDocument, mode: ValidationMode, options?: ValidationOptions) => ValidationReport;
//# sourceMappingURL=validation.d.ts.map
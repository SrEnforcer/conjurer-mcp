import type { Result } from '@tsfpp/prelude';
import type { EdnNode } from './edn-parser.js';
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
export declare const toCnjModel: (nodes: ReadonlyArray<EdnNode>, sourceFile: string) => Result<CnjDocument, string>;
//# sourceMappingURL=cnj-model.d.ts.map
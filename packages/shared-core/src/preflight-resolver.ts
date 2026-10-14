import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ok, err, isErr, isSome, fromNullable, absurd, mapErr } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import { toCnjModel } from './cnj-model.js';
import type { CnjDocument, CnjTarget, CnjModelError } from './cnj-model.js';
import { bindingNames } from './references.js';
import { describeCnjFileReason } from './workspace-state.js';
import type { CnjFileError } from './workspace-state.js';

export type ResolvedRef = {
  readonly from: string;
  readonly to: string;
  readonly outsideFolder: boolean;
};

export type UnresolvedRef = {
  readonly from: string;
  readonly target: string;
  readonly reason: string;
};

export type MissingPath = {
  readonly path: string;
  readonly reason: string;
};

/** A `.cnj` input the preflight could not read, so its targets and references are unknown. */
export type UnreadableFile = {
  readonly path: string;
  readonly reason: string;
};

export type MaterialisePreflightReport = {
  readonly projectName: string;
  readonly packageJsonRequired: boolean;
  readonly resolvedRefs: ReadonlyArray<ResolvedRef>;
  readonly unresolvedRefs: ReadonlyArray<UnresolvedRef>;
  readonly missingPaths: ReadonlyArray<MissingPath>;
  readonly unreadableFiles: ReadonlyArray<UnreadableFile>;
  readonly ready: boolean;
};

/** Why a folder could not be preflighted at all. */
export type PreflightError = { readonly kind: 'no_cnj_files'; readonly folder: string };

/**
 * Render a preflight error as the text tools report.
 *
 * @param e - The error.
 * @returns A one-line message naming the folder.
 */
export const describePreflightError = (e: PreflightError): string => {
  switch (e.kind) {
    case 'no_cnj_files': return `No .cnj files found in ${e.folder}`;
    default: return absurd(e.kind);
  }
};

const parseCnjFile = (filePath: string): Result<CnjDocument, CnjFileError> => {
  if (!existsSync(filePath)) return err({ kind: 'file_not_found', path: filePath });
  const content = readFileSync(filePath, 'utf8');
  const parsed = parse(content);
  if (isErr(parsed)) return err({ kind: 'file_unparseable', path: filePath, cause: parsed.error });
  return mapErr<CnjDocument, CnjModelError, CnjFileError>((cause) => ({ kind: 'file_unmodelable', path: filePath, cause }))(
    toCnjModel(parsed.value, filePath),
  );
};

const findCnjFiles = (folder: string): ReadonlyArray<string> => {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith('.cnj'))
    .map((f) => join(folder, f));
};

type ParsedInputs = {
  readonly docs: ReadonlyArray<CnjDocument>;
  readonly unreadable: ReadonlyArray<UnreadableFile>;
};

const parseDocs = (files: ReadonlyArray<string>): ParsedInputs => {
  const results = files.map((path) => ({ path, result: parseCnjFile(path) }));
  return {
    docs: results.flatMap(({ result }) => (isErr(result) ? [] : [result.value])),
    unreadable: results.flatMap(({ path, result }) =>
      isErr(result) ? [{ path, reason: describeCnjFileReason(result.error) }] : []),
  };
};

// A target's :from may name another target or any binding (core.md · target): def forms,
// :manifest bindings and target names, written as symbol or keyword.
const allKnownNames = (docs: ReadonlyArray<CnjDocument>): ReadonlyArray<string> =>
  docs.flatMap(bindingNames);

const modulePathsOf = (target: CnjTarget): ReadonlyArray<string> => {
  const pkg = `packages/${target.name}/src/`;
  return target.modules.flatMap((m) => {
    const nameNode = fromNullable(m.get('name'));
    if (!isSome(nameNode) || nameNode.value.type !== 'string') return [];
    return [`${pkg}${nameNode.value.value}`];
  });
};

const checkTargetDeps = (
  target: CnjTarget, sourceFile: string, known: ReadonlyArray<string>,
): { readonly resolved: ReadonlyArray<ResolvedRef>; readonly unresolved: ReadonlyArray<UnresolvedRef> } => {
  if (target.from === undefined) return { resolved: [], unresolved: [] };
  const dep = target.from;
  const isResolved = known.includes(dep);
  return isResolved
    ? { resolved: [{ from: sourceFile, to: dep, outsideFolder: false }], unresolved: [] }
    : { resolved: [], unresolved: [{ from: sourceFile, target: dep, reason: `'${dep}' is neither a declared target nor a binding (def or :manifest)` }] };
};

const collectDeps = (
  docs: ReadonlyArray<CnjDocument>, known: ReadonlyArray<string>,
): { readonly resolved: ReadonlyArray<ResolvedRef>; readonly unresolved: ReadonlyArray<UnresolvedRef> } => {
  const checks = docs.flatMap((d) =>
    d.targets.map((t) => checkTargetDeps(t, d.sourceFile, known)),
  );
  return {
    resolved: checks.flatMap((c) => c.resolved),
    unresolved: checks.flatMap((c) => c.unresolved),
  };
};

const collectMissingPaths = (docs: ReadonlyArray<CnjDocument>, root: string): ReadonlyArray<MissingPath> =>
  docs.flatMap((d) =>
    d.targets.flatMap((t) =>
      modulePathsOf(t).flatMap((p) => {
        const abs = join(root, p);
        return existsSync(abs) ? [] : [{ path: p, reason: 'Module file not found on disk' }];
      }),
    ),
  );

export const runMaterialisePreflight = (
  folder: string,
  projectName?: string,
  entryFiles?: ReadonlyArray<string>,
): Result<MaterialisePreflightReport, PreflightError> => {
  const files = entryFiles !== undefined && entryFiles.length > 0
    ? entryFiles
    : findCnjFiles(folder);
  if (files.length === 0) return err({ kind: 'no_cnj_files', folder });
  // An unreadable input is reported, never skipped: its targets and references are unknown,
  // so the plan is incomplete and the folder is not ready.
  const { docs, unreadable } = parseDocs(files);
  const known = allKnownNames(docs);
  const deps = collectDeps(docs, known);
  const missing = collectMissingPaths(docs, folder);
  const name = projectName ?? 'conjurer-mcp';
  return ok({
    projectName: name,
    packageJsonRequired: true,
    resolvedRefs: deps.resolved,
    unresolvedRefs: deps.unresolved,
    missingPaths: missing,
    unreadableFiles: unreadable,
    ready: deps.unresolved.length === 0 && unreadable.length === 0,
  });
};

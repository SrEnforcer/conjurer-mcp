import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ok, err, isErr, intoMap, sortWith, ordString, absurd } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import type { ParseError } from './edn-parser.js';
import { toCnjModel, describeCnjModelError } from './cnj-model.js';
import type { CnjDocument, CnjModelError } from './cnj-model.js';
import { bindingNames } from './references.js';

export type ParsedFileEntry = {
  readonly path: string;
  readonly content: string;
  readonly doc: CnjDocument;
  readonly directRefs: ReadonlyArray<string>;   // absolute paths of charter :references
};

/** A target `:from` that names neither a target nor a binding anywhere in the workspace. */
export type UnresolvedDependency = {
  readonly target: string;
  readonly dependency: string;
};

export type WorkspaceSnapshot = {
  readonly files: ReadonlyMap<string, ParsedFileEntry>;
  readonly targetEdges: ReadonlyMap<string, ReadonlyArray<string>>;  // target name → from targets
  /** Target name → `:from` names that resolve to a binding (`def`, `:manifest`) rather than a target. */
  readonly bindingDeps: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly unresolvedDeps: ReadonlyArray<UnresolvedDependency>;
  readonly cycleDetected: boolean;
};

/** Why one `.cnj` file could not be read into a document. */
export type CnjFileError =
  | { readonly kind: 'file_not_found'; readonly path: string }
  | { readonly kind: 'file_unparseable'; readonly path: string; readonly cause: ParseError }
  | { readonly kind: 'file_unmodelable'; readonly path: string; readonly cause: CnjModelError };

/**
 * Render a file error as the text tools report.
 *
 * @param e - The error.
 * @returns A one-line message naming the file.
 */
export const describeCnjFileError = (e: CnjFileError): string => {
  switch (e.kind) {
    case 'file_not_found': return `File not found: ${e.path}`;
    case 'file_unparseable': return `Parse error in ${e.path}: ${e.cause.message}`;
    case 'file_unmodelable': return `Model error in ${e.path}: ${describeCnjModelError(e.cause)}`;
    default: return absurd(e);
  }
};

/** Why a workspace snapshot could not be built from its entry file. */
export type WorkspaceError =
  | { readonly kind: 'entry_not_found'; readonly path: string }
  | { readonly kind: 'entry_unparseable'; readonly path: string };

/**
 * Render a workspace error as the text tools report.
 *
 * @param e - The error.
 * @returns A one-line message naming the entry file.
 */
export const describeWorkspaceError = (e: WorkspaceError): string => {
  switch (e.kind) {
    case 'entry_not_found': return `Entry file not found: ${e.path}`;
    case 'entry_unparseable': return `Could not parse entry file: ${e.path}`;
    default: return absurd(e);
  }
};

const parseEntry = (filePath: string): Result<ParsedFileEntry, CnjFileError> => {
  if (!existsSync(filePath)) return err({ kind: 'file_not_found', path: filePath });
  const content = readFileSync(filePath, 'utf8');
  const parsed = parse(content);
  if (isErr(parsed)) return err({ kind: 'file_unparseable', path: filePath, cause: parsed.error });
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) return err({ kind: 'file_unmodelable', path: filePath, cause: doc.error });
  const dir = dirname(filePath);
  const directRefs = doc.value.charter.references
    .map((ref) => resolve(dir, ref))
    .filter((abs) => abs !== filePath);
  return ok({ path: filePath, content, doc: doc.value, directRefs });
};

type Discovery = {
  readonly visited: ReadonlyMap<string, ParsedFileEntry>;
  readonly queue: ReadonlyArray<string>;
};

// Breadth-first over charter :references, transitively; a file that does not parse is skipped.
const discoverStep = (d: Discovery): ReadonlyMap<string, ParsedFileEntry> => {
  const [next, ...rest] = d.queue;
  if (next === undefined) return d.visited;
  if (d.visited.has(next)) return discoverStep({ visited: d.visited, queue: rest });
  const entry = parseEntry(next);
  if (isErr(entry)) return discoverStep({ visited: d.visited, queue: rest });
  const visited = intoMap([...d.visited.entries(), [next, entry.value] as const]);
  return discoverStep({ visited, queue: [...rest, ...entry.value.directRefs.filter((ref) => !visited.has(ref))] });
};

const discoverFiles = (entryFile: string): ReadonlyMap<string, ParsedFileEntry> =>
  discoverStep({ visited: intoMap([]), queue: [resolve(entryFile)] });

// A later target with the same name replaces an earlier one, as Map construction does.
const buildTargetEdges = (
  files: ReadonlyMap<string, ParsedFileEntry>,
): ReadonlyMap<string, ReadonlyArray<string>> =>
  intoMap(Array.from(files.values()).flatMap((entry) =>
    entry.doc.targets.map((target) => [target.name, target.from !== undefined ? [target.from] : []] as const)));

type TopoState = {
  readonly sorted: ReadonlyArray<string>;
  readonly visiting: ReadonlyArray<string>;
  readonly visited: ReadonlyArray<string>;
  readonly cycleDetected: boolean;
};

const visitTarget = (
  name: string,
  edges: ReadonlyMap<string, ReadonlyArray<string>>,
  state: TopoState,
): TopoState => {
  if (state.visiting.includes(name)) return { ...state, cycleDetected: true };
  if (state.visited.includes(name)) return state;

  const deps = edges.get(name) ?? [];
  const withVisiting: TopoState = {
    ...state,
    visiting: [...state.visiting, name],
  };

  const afterDeps = deps.reduce<TopoState>(
    (s, dep) => visitTarget(dep, edges, s),
    withVisiting,
  );

  return {
    sorted: [...afterDeps.sorted, name],
    visiting: afterDeps.visiting.filter((v) => v !== name),
    visited: [...afterDeps.visited, name],
    cycleDetected: afterDeps.cycleDetected,
  };
};

export const topoOrder = (
  snapshot: WorkspaceSnapshot,
  entryFile: string,
): ReadonlyArray<string> => {
  const entry = snapshot.files.get(resolve(entryFile));
  if (entry === undefined) return [];
  const targetNames = entry.doc.targets.map((t) => t.name);
  const initial: TopoState = {
    sorted: [],
    visiting: [],
    visited: [],
    cycleDetected: false,
  };
  const result = targetNames.reduce<TopoState>(
    (s, name) => visitTarget(name, snapshot.targetEdges, s),
    initial,
  );
  return result.sorted;
};

export const computeContextKey = (
  snapshot: WorkspaceSnapshot,
  files: ReadonlyArray<string>,
): string => {
  // Hashing the concatenation equals updating the hash file by file, in sorted order.
  const contents = sortWith(ordString)(files).map((f) => snapshot.files.get(f)?.content ?? '');
  return createHash('sha256').update(contents.join('')).digest('hex').slice(0, 16);
};

export const buildWorkspaceSnapshot = (entryFile: string): Result<WorkspaceSnapshot, WorkspaceError> => {
  if (!existsSync(entryFile)) return err({ kind: 'entry_not_found', path: entryFile });
  const files = discoverFiles(entryFile);
  if (files.size === 0) return err({ kind: 'entry_unparseable', path: entryFile });
  const declaredFroms = buildTargetEdges(files);
  const targetNames = Array.from(declaredFroms.keys());
  const bindings = Array.from(files.values()).flatMap((entry) => bindingNames(entry.doc));
  const partition = (pred: (dep: string) => boolean): ReadonlyMap<string, ReadonlyArray<string>> =>
    intoMap(Array.from(declaredFroms.entries()).map(([name, froms]) => [name, froms.filter(pred)] as const));
  const targetEdges = partition((dep) => targetNames.includes(dep));
  const bindingDeps = partition((dep) => !targetNames.includes(dep) && bindings.includes(dep));
  const unresolvedDeps: ReadonlyArray<UnresolvedDependency> = Array.from(declaredFroms.entries())
    .flatMap(([target, froms]) => froms
      .filter((dep) => !targetNames.includes(dep) && !bindings.includes(dep))
      .map((dependency) => ({ target, dependency })));

  const initial: TopoState = {
    sorted: [],
    visiting: [],
    visited: [],
    cycleDetected: false,
  };
  const allTargets = Array.from(targetEdges.keys());
  const topoResult = allTargets.reduce<TopoState>(
    (s, name) => visitTarget(name, targetEdges, s),
    initial,
  );

  return ok({ files, targetEdges, bindingDeps, unresolvedDeps, cycleDetected: topoResult.cycleDetected });
};

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ok, err, isErr, intoMap, sortWith, ordString, absurd, tryCatch } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import type { ParseError } from './edn-parser.js';
import { toCnjModel, describeCnjModelError } from './cnj-model.js';
import type { CnjDocument, CnjModelError } from './cnj-model.js';
import { bindingNames } from './references.js';
import { describeThrown } from './thrown.js';

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

/** A `.cnj` input that could not be read, so its targets and references are unknown. */
export type UnreadableFile = {
  readonly path: string;
  readonly reason: string;
};

export type WorkspaceSnapshot = {
  readonly files: ReadonlyMap<string, ParsedFileEntry>;
  /** Files reached through charter `:references` that could not be read; never silently dropped. */
  readonly unreadableFiles: ReadonlyArray<UnreadableFile>;
  readonly targetEdges: ReadonlyMap<string, ReadonlyArray<string>>;  // target name → from targets
  /** Target name → `:from` names that resolve to a binding (`def`, `:manifest`) rather than a target. */
  readonly bindingDeps: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly unresolvedDeps: ReadonlyArray<UnresolvedDependency>;
  readonly cycleDetected: boolean;
};

/** Why one `.cnj` file could not be read into a document. */
export type CnjFileError =
  | { readonly kind: 'file_not_found'; readonly path: string }
  | { readonly kind: 'file_unreadable'; readonly path: string; readonly reason: string }
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
    case 'file_unreadable': return `Unreadable: ${e.path}: ${e.reason}`;
    case 'file_unparseable': return `Parse error in ${e.path}: ${e.cause.message}`;
    case 'file_unmodelable': return `Model error in ${e.path}: ${describeCnjModelError(e.cause)}`;
    default: return absurd(e);
  }
};

/**
 * Render why a file could not be read, without its path, for reports that carry the path
 * in a field of their own. A parse error names its line and column.
 *
 * @param e - The error.
 * @returns A one-line reason.
 */
export const describeCnjFileReason = (e: CnjFileError): string => {
  switch (e.kind) {
    case 'file_not_found': return 'File not found';
    case 'file_unreadable': return `Unreadable: ${e.reason}`;
    case 'file_unparseable': return `Parse error at ${e.cause.line}:${e.cause.column}: ${e.cause.message}`;
    case 'file_unmodelable': return `Model error: ${describeCnjModelError(e.cause)}`;
    default: return absurd(e);
  }
};

/** Why a workspace snapshot could not be built from its entry file. */
export type WorkspaceError =
  | { readonly kind: 'entry_not_found'; readonly path: string }
  | { readonly kind: 'entry_unparseable'; readonly path: string; readonly cause: CnjFileError };

/**
 * Render a workspace error as the text tools report.
 *
 * @param e - The error.
 * @returns A one-line message naming the entry file.
 */
export const describeWorkspaceError = (e: WorkspaceError): string => {
  switch (e.kind) {
    case 'entry_not_found': return `Entry file not found: ${e.path}`;
    case 'entry_unparseable': return `Could not parse entry file: ${e.path} (${describeCnjFileReason(e.cause)})`;
    default: return absurd(e);
  }
};

/**
 * Whether a charter `:references` entry names a local `.cnj` file, the only kind the
 * workspace follows. A URL or another file type (README, source) is a plain reference.
 *
 * @param ref - The reference as written.
 * @returns True for a local `.cnj` path.
 */
export const isCnjFileReference = (ref: string): boolean =>
  ref.endsWith('.cnj') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(ref);

/**
 * Read a `.cnj` file's text. A path that exists but cannot be read, such as a directory,
 * is an error value rather than an exception.
 *
 * @param filePath - The file to read.
 * @returns Its text, or why it could not be read.
 */
export const readCnjText = (filePath: string): Result<string, CnjFileError> => {
  if (!existsSync(filePath)) return err({ kind: 'file_not_found', path: filePath });
  return tryCatch(
    () => readFileSync(filePath, 'utf8'),
    (e): CnjFileError => ({ kind: 'file_unreadable', path: filePath, reason: describeThrown(e) }),
  );
};

const parseEntry = (filePath: string): Result<ParsedFileEntry, CnjFileError> => {
  const text = readCnjText(filePath);
  if (isErr(text)) return err(text.error);
  const content = text.value;
  const parsed = parse(content);
  if (isErr(parsed)) return err({ kind: 'file_unparseable', path: filePath, cause: parsed.error });
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) return err({ kind: 'file_unmodelable', path: filePath, cause: doc.error });
  const dir = dirname(filePath);
  const directRefs = doc.value.charter.references
    .filter(isCnjFileReference)
    .map((ref) => resolve(dir, ref))
    .filter((abs) => abs !== filePath);
  return ok({ path: filePath, content, doc: doc.value, directRefs });
};

type Discovery = {
  readonly visited: ReadonlyMap<string, ParsedFileEntry>;
  readonly unreadable: ReadonlyArray<UnreadableFile>;
};

// Breadth-first over charter :references, transitively. A file that cannot be read is
// recorded with its reason, once, and its own references stay unknown.
const discover = (entryPath: string, entry: ParsedFileEntry): Discovery => {
  /* eslint-disable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data, no-restricted-syntax -- DEVIATION(4.2): no tail-call elimination in JS; a loop over a local queue keeps stack depth constant in the number of files. DEVIATION(1.9): local Map and Set, never returned mutable. */
  const visited = new Map<string, ParsedFileEntry>([[entryPath, entry]]);
  const unreadable: UnreadableFile[] = [];
  const failed = new Set<string>();
  const isSeen = (path: string): boolean => visited.has(path) || failed.has(path);
  const queue: string[] = [...entry.directRefs];
  for (let head = 0; head < queue.length; head += 1) {
    const next = queue[head] ?? '';
    if (isSeen(next)) continue;
    const parsed = parseEntry(next);
    if (isErr(parsed)) {
      failed.add(next);
      unreadable.push({ path: next, reason: describeCnjFileReason(parsed.error) });
      continue;
    }
    visited.set(next, parsed.value);
    queue.push(...parsed.value.directRefs.filter((ref) => !isSeen(ref)));
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data, no-restricted-syntax */
  return { visited, unreadable };
};

// A later target with the same name replaces an earlier one, as Map construction does.
const buildTargetEdges = (
  files: ReadonlyMap<string, ParsedFileEntry>,
): ReadonlyMap<string, ReadonlyArray<string>> =>
  intoMap(Array.from(files.values()).flatMap((entry) =>
    entry.doc.targets.map((target) => [target.name, target.from !== undefined ? [target.from] : []] as const)));

type TopoResult = {
  readonly sorted: ReadonlyArray<string>;
  readonly cycleDetected: boolean;
};

// Depth-first over :from edges from each root in turn, dependencies before dependents.
// A dependency met again while it is still being visited is a cycle.
const topoSort = (roots: ReadonlyArray<string>, edges: ReadonlyMap<string, ReadonlyArray<string>>): TopoResult => {
  /* eslint-disable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data, no-restricted-syntax -- DEVIATION(4.2): no tail-call elimination in JS; an explicit stack keeps call depth constant however long a :from chain is. DEVIATION(1.9): local Sets, never returned. */
  const sorted: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: Array<{ readonly name: string; next: number }> = [];
  let cycleDetected = false;
  const enter = (name: string): void => {
    if (visiting.has(name)) cycleDetected = true;
    else if (!visited.has(name)) {
      visiting.add(name);
      stack.push({ name, next: 0 });
    }
  };
  for (const root of roots) {
    enter(root);
    while (stack.length > 0) {
      const top = stack[stack.length - 1] ?? { name: '', next: 0 };
      const dep = (edges.get(top.name) ?? [])[top.next];
      top.next += 1;
      if (dep !== undefined) enter(dep);
      else {
        stack.pop();
        visiting.delete(top.name);
        visited.add(top.name);
        sorted.push(top.name);
      }
    }
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data, no-restricted-syntax */
  return { sorted, cycleDetected };
};

export const topoOrder = (
  snapshot: WorkspaceSnapshot,
  entryFile: string,
): ReadonlyArray<string> => {
  const entry = snapshot.files.get(resolve(entryFile));
  if (entry === undefined) return [];
  return topoSort(entry.doc.targets.map((t) => t.name), snapshot.targetEdges).sorted;
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
  const entryPath = resolve(entryFile);
  const entry = parseEntry(entryPath);
  if (isErr(entry)) return err({ kind: 'entry_unparseable', path: entryFile, cause: entry.error });
  const discovered = discover(entryPath, entry.value);
  const files = discovered.visited;
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

  const topoResult = topoSort(Array.from(targetEdges.keys()), targetEdges);

  return ok({
    files, unreadableFiles: discovered.unreadable, targetEdges, bindingDeps, unresolvedDeps, cycleDetected: topoResult.cycleDetected,
  });
};

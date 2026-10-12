import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ok, err, isErr, intoMap } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import { toCnjModel } from './cnj-model.js';
import type { CnjDocument } from './cnj-model.js';
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

const parseEntry = (filePath: string): Result<ParsedFileEntry, string> => {
  if (!existsSync(filePath)) return err(`File not found: ${filePath}`);
  const content = readFileSync(filePath, 'utf8');
  const parsed = parse(content);
  if (isErr(parsed)) return err(`Parse error in ${filePath}: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) return err(`Model error in ${filePath}: ${doc.error}`);
  const dir = dirname(filePath);
  const directRefs = doc.value.charter.references
    .map((ref) => resolve(dir, ref))
    .filter((abs) => abs !== filePath);
  return ok({ path: filePath, content, doc: doc.value, directRefs });
};

const discoverFiles = (
  entryFile: string,
): ReadonlyMap<string, ParsedFileEntry> => {
  // DEVIATION(2.4): Mutable accumulator within a bounded discovery loop.
  const visited = new Map<string, ParsedFileEntry>();
  const queue: string[] = [resolve(entryFile)];

  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined || visited.has(next)) continue;
    const entry = parseEntry(next);
    if (isErr(entry)) continue;
    visited.set(next, entry.value);
    // Follow one level of charter :references
    for (const ref of entry.value.directRefs) {
      if (!visited.has(ref)) queue.push(ref);
    }
  }

  return visited;
};

const buildTargetEdges = (
  files: ReadonlyMap<string, ParsedFileEntry>,
): ReadonlyMap<string, ReadonlyArray<string>> => {
  // DEVIATION(2.4): Mutable accumulator for target dependency graph construction.
  const edges = new Map<string, ReadonlyArray<string>>();
  for (const entry of files.values()) {
    for (const target of entry.doc.targets) {
      const froms = target.from !== undefined ? [target.from] : [];
      edges.set(target.name, froms);
    }
  }
  return edges;
};

type TopoState = {
  readonly sorted: ReadonlyArray<string>;
  readonly visiting: ReadonlySet<string>;
  readonly visited: ReadonlySet<string>;
  readonly cycleDetected: boolean;
};

const visitTarget = (
  name: string,
  edges: ReadonlyMap<string, ReadonlyArray<string>>,
  state: TopoState,
): TopoState => {
  if (state.visiting.has(name)) return { ...state, cycleDetected: true };
  if (state.visited.has(name)) return state;

  const deps = edges.get(name) ?? [];
  const withVisiting: TopoState = {
    ...state,
    visiting: new Set([...state.visiting, name]),
  };

  const afterDeps = deps.reduce<TopoState>(
    (s, dep) => visitTarget(dep, edges, s),
    withVisiting,
  );

  return {
    sorted: [...afterDeps.sorted, name],
    visiting: new Set([...afterDeps.visiting].filter((v) => v !== name)),
    visited: new Set([...afterDeps.visited, name]),
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
    visiting: new Set(),
    visited: new Set(),
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
  const h = createHash('sha256');
  for (const f of [...files].sort()) {
    const entry = snapshot.files.get(f);
    if (entry !== undefined) h.update(entry.content);
  }
  return h.digest('hex').slice(0, 16);
};

export const buildWorkspaceSnapshot = (entryFile: string): Result<WorkspaceSnapshot, string> => {
  if (!existsSync(entryFile)) return err(`Entry file not found: ${entryFile}`);
  const files = discoverFiles(entryFile);
  if (files.size === 0) return err(`Could not parse entry file: ${entryFile}`);
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
    visiting: new Set(),
    visited: new Set(),
    cycleDetected: false,
  };
  const allTargets = Array.from(targetEdges.keys());
  const topoResult = allTargets.reduce<TopoState>(
    (s, name) => visitTarget(name, targetEdges, s),
    initial,
  );

  return ok({ files, targetEdges, bindingDeps, unresolvedDeps, cycleDetected: topoResult.cycleDetected });
};

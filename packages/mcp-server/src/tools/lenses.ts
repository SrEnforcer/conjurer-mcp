/**
 * Lens tools for workspace-level cross-file analysis.
 */
/* eslint-disable no-restricted-syntax -- DEVIATION(1.9): graph traversal requires constructor-based collections at module boundary. */
/* eslint-disable functional/no-loop-statements -- DEVIATION(4.2): dependency-graph traversals require explicit loops for deterministic bounded scans. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): local mutation is confined to ephemeral accumulators during graph assembly. */
import { resolve as resolvePath } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildWorkspaceSnapshot, topoOrder, validateCnj } from '@conjurer/core';
import { isErr, fromNullable, getOrElseOption, intoMap } from '@tsfpp/prelude';
import type { WorkspaceSnapshot } from '@conjurer/core';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

type ScopeMeta = {
  readonly method: 'references_bfs';
  readonly entry: string;
  readonly files_discovered: number;
  readonly note: string;
};

const scopeMeta = (entry: string, filesDiscovered: number): ScopeMeta => ({
  method: 'references_bfs' as const,
  entry,
  files_discovered: filesDiscovered,
  note: 'files not reachable via :references are excluded',
});

const reachableFrom = (
  start: string,
  edges: ReadonlyMap<string, ReadonlyArray<string>>,
): ReadonlyArray<string> => {
  // DEVIATION(4.2): BFS traversal loop for dependency graph reachability.
  const result = new Set<string>([start]);
  const queue = [start];
  // DEVIATION(4.2): Queue-driven traversal loop over workspace graph.
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    // DEVIATION(4.2): Edge iteration within BFS traversal.
    for (const dep of getOrElseOption<ReadonlyArray<string>>(() => [])(fromNullable(edges.get(next)))) {
      if (!result.has(dep)) { result.add(dep); queue.push(dep); }
    }
  }
  return Array.from(result);
};

// Which file declares each target; a later declaration of the same name wins.
const targetFiles = (snapshot: WorkspaceSnapshot): ReadonlyMap<string, string> =>
  intoMap(Array.from(snapshot.files.values()).flatMap((f) => f.doc.targets.map((t) => [t.name, f.path] as const)));

const scopedEdges = (
  graph: ReadonlyMap<string, ReadonlyArray<string>>,
  scope: ReadonlyArray<string>,
): ReadonlyArray<{ readonly from: string; readonly to: string }> =>
  Array.from(graph.entries())
    .filter(([tgt]) => scope.includes(tgt))
    .flatMap(([tgt, deps]) => deps.filter((dep) => scope.includes(dep)).map((dep) => ({ from: dep, to: tgt })));

// Target names grouped by declaring file, in scope order.
const groupByFile = (
  scope: ReadonlyArray<string>,
  fileOf: (name: string) => string,
): Readonly<Record<string, ReadonlyArray<string>>> =>
  scope.reduce<Readonly<Record<string, ReadonlyArray<string>>>>((acc, name) => {
    const file = fileOf(name);
    return { ...acc, [file]: [...(acc[file] ?? []), name] };
  }, {});

/**
 * Return the cross-file target dependency graph and topological order.
 *
 * @param filePath - Entry cnj file path.
 * @param target - Optional root target for subgraph filtering.
 * @returns Tool text content payload.
 */
export const handleLensDependencyGraph = (
  filePath: string,
  target: string | undefined = undefined,
): ToolContent => {
  const abs = resolvePath(filePath);
  const snapshotRes = buildWorkspaceSnapshot(abs);
  if (isErr(snapshotRes)) return toContent(`Workspace error: ${snapshotRes.error}`);
  const snapshot = snapshotRes.value;

  const fileOfTarget = targetFiles(snapshot);
  const fileOf = (name: string): string => getOrElseOption(() => abs)(fromNullable(fileOfTarget.get(name)));
  const scope: ReadonlyArray<string> = target !== undefined
    ? reachableFrom(target, snapshot.targetEdges)
    : Array.from(snapshot.targetEdges.keys());
  const nodes = scope.map((name) => ({ name, file: fileOf(name) }));
  const edges = scopedEdges(snapshot.targetEdges, scope);
  const order = topoOrder(snapshot, abs).filter((n) => scope.includes(n));
  const byFile = groupByFile(scope, fileOf);

  return toContent(JSON.stringify({
    nodes,
    edges,
    topo_order: order,
    cycle_detected: snapshot.cycleDetected,
    by_file: byFile,
    scope: scopeMeta(abs, snapshot.files.size),
  }, null, 2));
};

/**
 * Aggregate all open questions across a workspace.
 *
 * @param filePath - Entry cnj file path.
 * @returns Tool text content payload.
 */
export const handleLensOpenQuestions = (filePath: string): ToolContent => {
  const abs = resolvePath(filePath);
  const snapshotRes = buildWorkspaceSnapshot(abs);
  if (isErr(snapshotRes)) return toContent(`Workspace error: ${snapshotRes.error}`);
  const snapshot = snapshotRes.value;

  const filesWithOpen = Array.from(snapshot.files.values())
    .filter((entry) => entry.doc.charter.open.length > 0)
    .map((entry) => ({
      file: entry.path,
      title: entry.doc.charter.title,
      open: entry.doc.charter.open,
    }));

  const totalOpen = filesWithOpen.reduce((s, f) => s + f.open.length, 0);

  return toContent(JSON.stringify({
    files_with_open: filesWithOpen,
    total_open: totalOpen,
    total_files_scanned: snapshot.files.size,
    scope: scopeMeta(abs, snapshot.files.size),
  }, null, 2));
};

/**
 * Return aggregate structural stats for all cnj files in a workspace.
 *
 * @param filePath - Entry cnj file path.
 * @returns Tool text content payload.
 */
export const handleWorkspaceSummary = (filePath: string): ToolContent => {
  const abs = resolvePath(filePath);
  const snapshotRes = buildWorkspaceSnapshot(abs);
  if (isErr(snapshotRes)) return toContent(`Workspace error: ${snapshotRes.error}`);
  const snapshot = snapshotRes.value;

  const files = Array.from(snapshot.files.values()).map((entry) => {
    const report = validateCnj(entry.doc, 'authored');
    return {
      file: entry.path,
      title: entry.doc.charter.title,
      version: entry.doc.charter.version,
      targets: entry.doc.targets.length,
      decisions: entry.doc.charter.decisions.length,
      open: entry.doc.charter.open.length,
      valid: report.valid,
      violations: report.violations.length,
    };
  });

  const totals = {
    files: files.length,
    targets: files.reduce((s, f) => s + f.targets, 0),
    decisions: files.reduce((s, f) => s + f.decisions, 0),
    open: files.reduce((s, f) => s + f.open, 0),
    valid_files: files.filter((f) => f.valid).length,
    invalid_files: files.filter((f) => !f.valid).length,
  };

  return toContent(JSON.stringify({
    files,
    totals,
    scope: scopeMeta(abs, snapshot.files.size),
  }, null, 2));
};

/**
 * Register workspace-lens MCP tools.
 *
 * @param server - MCP server.
 * @returns No return value.
 */
export const registerLensTools = (server: McpServer): void => {
  server.registerTool('lens_open_questions', {
    description: 'Aggregate all open questions across a workspace — cross-file open question inventory',
    inputSchema: { file: z.string() },
  }, ({ file }) => ({ content: [...handleLensOpenQuestions(file)] }));

  server.registerTool('workspace_summary', {
    description: 'Aggregate structural stats across all .cnj files in a workspace in one call',
    inputSchema: { file: z.string() },
  }, ({ file }) => ({ content: [...handleWorkspaceSummary(file)] }));

  server.registerTool('lens_dependency_graph', {
    description: 'Return the cross-file target dependency graph and topological order for a workspace',
    inputSchema: {
      file: z.string(),
      target: z.string().optional(),
    },
  }, ({ file, target }) => ({ content: [...handleLensDependencyGraph(file, target)] }));
};

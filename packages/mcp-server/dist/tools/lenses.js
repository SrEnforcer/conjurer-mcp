/**
 * Lens tools for workspace-level cross-file analysis.
 */
/* eslint-disable no-restricted-syntax -- DEVIATION(1.9): graph traversal requires constructor-based collections at module boundary. */
/* eslint-disable functional/no-loop-statements -- DEVIATION(4.2): dependency-graph traversals require explicit loops for deterministic bounded scans. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): local mutation is confined to ephemeral accumulators during graph assembly. */
/* eslint-disable max-lines-per-function -- DEVIATION(3.4): lens handlers mirror MCP contract branches; workspace fold logic is kept together. */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations in adapter code paths. */
import { resolve as resolvePath } from 'node:path';
import { z } from 'zod';
import { buildWorkspaceSnapshot, topoOrder, validateCnj } from '@conjurer/core';
import { isErr, fromNullable, getOrElse } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
const scopeMeta = (entry, filesDiscovered) => ({
    method: 'references_bfs',
    entry,
    files_discovered: filesDiscovered,
    note: 'files not reachable via :references are excluded',
});
const reachableFrom = (start, edges) => {
    // DEVIATION(4.2): BFS traversal loop for dependency graph reachability.
    const result = new Set([start]);
    const queue = [start];
    // DEVIATION(4.2): Queue-driven traversal loop over workspace graph.
    while (queue.length > 0) {
        const next = queue.shift();
        if (next === undefined)
            break;
        // DEVIATION(4.2): Edge iteration within BFS traversal.
        for (const dep of getOrElse(() => [])(fromNullable(edges.get(next)))) {
            if (!result.has(dep)) {
                result.add(dep);
                queue.push(dep);
            }
        }
    }
    return Array.from(result);
};
/**
 * Return the cross-file target dependency graph and topological order.
 *
 * @param filePath - Entry cnj file path.
 * @param target - Optional root target for subgraph filtering.
 * @returns Tool text content payload.
 */
export const handleLensDependencyGraph = (filePath, target = undefined) => {
    const abs = resolvePath(filePath);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const allFiles = Array.from(snapshot.files.values());
    // DEVIATION(2.2): Mutable map used for adjacency/file indexing at adapter boundary.
    const targetFileMap = new Map();
    // DEVIATION(4.2): Graph indexing loop across workspace files.
    for (const f of allFiles) {
        // DEVIATION(4.2): Nested target iteration for index construction.
        for (const t of f.doc.targets)
            targetFileMap.set(t.name, f.path);
    }
    const scope = target !== undefined
        ? reachableFrom(target, snapshot.targetEdges)
        : Array.from(snapshot.targetEdges.keys());
    const scopeSet = new Set(scope);
    const nodes = scope.map((name) => ({ name, file: getOrElse(() => abs)(fromNullable(targetFileMap.get(name))) }));
    const edges = [];
    // DEVIATION(4.2): Graph edge extraction loop over adjacency lists.
    for (const [tgt, deps] of snapshot.targetEdges.entries()) {
        if (!scopeSet.has(tgt))
            continue;
        // DEVIATION(4.2): Dependency edge scan inside adjacency iteration.
        for (const dep of deps) {
            if (scopeSet.has(dep))
                edges.push({ from: dep, to: tgt });
        }
    }
    const order = topoOrder(snapshot, abs).filter((n) => scopeSet.has(n));
    const byFile = {};
    // DEVIATION(4.2): File grouping loop for graph output shaping.
    for (const name of scope) {
        const file = getOrElse(() => abs)(fromNullable(targetFileMap.get(name)));
        if (byFile[file] === undefined)
            byFile[file] = [];
        byFile[file].push(name);
    }
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
export const handleLensOpenQuestions = (filePath) => {
    const abs = resolvePath(filePath);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
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
export const handleWorkspaceSummary = (filePath) => {
    const abs = resolvePath(filePath);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
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
export const registerLensTools = (server) => {
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

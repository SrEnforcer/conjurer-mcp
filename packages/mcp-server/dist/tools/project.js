/**
 * Project-oriented MCP tools for dependency planning and workspace topology.
 */
/* eslint-disable no-restricted-syntax -- DEVIATION(1.9): graph traversal and adapter cache require constructor-based collections at module boundary. */
/* eslint-disable functional/no-loop-statements -- DEVIATION(4.2): dependency-graph traversals require explicit loops for deterministic bounded scans. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): local mutation is confined to ephemeral accumulators during graph assembly. */
/* eslint-disable max-lines-per-function -- DEVIATION(3.4): tool handlers mirror MCP contract branches; decomposition deferred to dedicated refactor slice. */
/* eslint-disable complexity -- DEVIATION(3.4): complexity reflects protocol branching and dependency states. */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations in adapter code paths. */
import { resolve as resolvePath } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { parse, toCnjModel, runMaterialisePreflight, buildWorkspaceSnapshot, topoOrder, computeContextKey } from '@conjurer/core';
import { isErr, fromNullable, getOrElse, isSome } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
// DEVIATION(2.4): Process-local evaluate cache — in-memory for the stdio session lifetime.
// Session-local only; not shared across concurrent server instances.
// DEVIATION(2.2): Adapter cache uses mutable Map for session-lifetime updates.
const evaluateCache = new Map();
const ARTIFACT_NOTE = 'artifact field is intentionally empty — generation belongs to the IDE agent, not this server';
const readSrc = (filePath = undefined, content = undefined) => {
    const contentOpt = fromNullable(content);
    if (isSome(contentOpt))
        return contentOpt.value;
    const pathOpt = fromNullable(filePath);
    if (isSome(pathOpt) && existsSync(pathOpt.value))
        return readFileSync(pathOpt.value, 'utf8');
    return undefined;
};
const inlineResolvePlan = (content) => {
    const parsed = parse(content);
    if (isErr(parsed))
        return toContent(`Parse error: ${parsed.error.message}`);
    const doc = toCnjModel(parsed.value, '<inline>');
    if (isErr(doc))
        return toContent(`Model error: ${doc.error}`);
    const plan = doc.value.targets.map((t, i) => ({
        form: 'target', file: '<inline>', name: t.name, order: i,
        reason: 'context-injection',
    }));
    return toContent(JSON.stringify({ plan, dependency_graph: {}, unresolved: [] }, null, 2));
};
/**
 * Resolve target execution order and unresolved dependencies.
 *
 * @param filePath - Entry cnj path.
 * @param content - Inline cnj content.
 * @param formName - Optional target filter.
 * @returns Tool text content payload.
 */
export const handleResolve = (filePath = undefined, content = undefined, formName = undefined) => {
    if (filePath === undefined) {
        const src = readSrc(undefined, content);
        if (src === undefined)
            return toContent('Provide file or content');
        return inlineResolvePlan(src);
    }
    const abs = resolvePath(filePath);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const entry = snapshot.files.get(abs);
    if (entry === undefined)
        return toContent(`Could not parse: ${filePath}`);
    const order = topoOrder(snapshot, abs);
    const allFiles = Array.from(snapshot.files.values());
    // DEVIATION(2.2): Mutable map construction for SDK-adapter graph indexing.
    const targetFileMap = new Map();
    // DEVIATION(4.2): Graph materialisation loop over snapshot targets.
    for (const f of allFiles) {
        // DEVIATION(4.2): Nested target scan over parsed workspace files.
        for (const t of f.doc.targets)
            targetFileMap.set(t.name, f.path);
    }
    const entryTargetNames = new Set(entry.doc.targets.map((t) => t.name));
    const plan = order
        .filter((name) => formName === undefined || name === formName || !entryTargetNames.has(name) || order.indexOf(name) < order.indexOf(formName))
        .map((name, i) => {
        const sourceFile = getOrElse(() => abs)(fromNullable(targetFileMap.get(name)));
        const isDirect = isSome(fromNullable(snapshot.targetEdges.get(name)));
        const selectedFormName = getOrElse(() => name)(fromNullable(formName));
        return {
            form: 'target',
            file: sourceFile,
            name,
            order: i,
            reason: sourceFile === abs && name === selectedFormName ? 'context-injection'
                : isDirect ? 'direct-dependency' : 'transitive',
        };
    });
    const graphOut = {};
    // DEVIATION(4.2): Loop used to build adjacency output record.
    for (const [k, v] of snapshot.targetEdges.entries())
        graphOut[k] = v;
    const unresolved = Array.from(snapshot.targetEdges.entries())
        .flatMap(([targetName, froms]) => froms
        .filter((dep) => !snapshot.targetEdges.has(dep))
        .map((dep) => ({
        symbol: dep,
        expected_in: getOrElse(() => abs)(fromNullable(targetFileMap.get(targetName))),
    })));
    const planId = computeContextKey(snapshot, [abs]);
    return toContent(JSON.stringify({
        plan_id: planId,
        plan,
        dependency_graph: graphOut,
        unresolved,
        cycle_detected: snapshot.cycleDetected,
    }, null, 2));
};
/**
 * Evaluate workspace cache state and stale markers.
 * Cache is process-local and not shared across concurrent server instances.
 *
 * @param filePath - Entry file path.
 * @param resolveId - Optional resolve request id.
 * @param mode - Evaluation mode.
 * @returns Tool text content payload.
 */
export const handleEvaluate = (filePath = undefined, resolveId = undefined, mode = undefined) => {
    if (filePath === undefined) {
        const cacheKey = getOrElse(() => `eval-${Date.now()}`)(fromNullable(resolveId));
        return toContent(JSON.stringify({ cache_hit: false, cache_key: cacheKey, artifact: {}, artifact_note: ARTIFACT_NOTE, stale: [] }, null, 2));
    }
    const abs = resolvePath(filePath);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const allFilePaths = Array.from(snapshot.files.keys());
    const cacheKey = computeContextKey(snapshot, allFilePaths);
    const prior = evaluateCache.get(abs);
    if (prior !== undefined && prior.cacheKey === cacheKey) {
        return toContent(JSON.stringify({
            cache_hit: true,
            cache_key: cacheKey,
            mode: getOrElse(() => 'deterministic')(fromNullable(mode)),
            artifact: {},
            artifact_note: ARTIFACT_NOTE,
            stale: [],
        }, null, 2));
    }
    const stale = prior !== undefined
        ? [{ form_name: filePath, reason: 'workspace context changed since last evaluate' }]
        : [];
    evaluateCache.set(abs, { cacheKey, evaluatedAt: Date.now() });
    return toContent(JSON.stringify({
        cache_hit: false,
        cache_key: cacheKey,
        mode: getOrElse(() => 'deterministic')(fromNullable(mode)),
        artifact: {},
        artifact_note: ARTIFACT_NOTE,
        stale,
    }, null, 2));
};
const handleLintTopology = (workspace = undefined) => {
    const root = getOrElse(() => process.cwd())(fromNullable(workspace));
    const r = runMaterialisePreflight(root);
    if (isErr(r)) {
        return toContent(JSON.stringify({ issues: [{ severity: 'warning', file: root, message: r.error }], summary: { ready: false } }, null, 2));
    }
    const issues = r.value.unresolvedRefs.map((u) => ({
        severity: 'error', file: u.from, message: `Unresolved: ${u.target} — ${u.reason}`,
    }));
    return toContent(JSON.stringify({ issues, summary: { ready: r.value.ready } }, null, 2));
};
/**
 * Run materialise preflight checks for a folder.
 *
 * @param folder - Workspace folder path.
 * @param projectName - Optional project name override.
 * @param entryFiles - Optional explicit entry files.
 * @returns Tool text content payload.
 */
export const handlePreflight = (folder, projectName = undefined, entryFiles = undefined) => {
    const r = runMaterialisePreflight(folder, projectName, entryFiles);
    if (isErr(r))
        return toContent(r.error);
    return toContent(JSON.stringify({
        project_name: r.value.projectName,
        package_json_required: r.value.packageJsonRequired,
        resolved_refs: r.value.resolvedRefs,
        unresolved_refs: r.value.unresolvedRefs,
        missing_paths: r.value.missingPaths,
        ready: r.value.ready,
    }, null, 2));
};
export const registerProjectTools = (server) => {
    server.registerTool('resolve', {
        description: 'Resolve a .cnj file into dependency-aware target execution order',
        inputSchema: {
            content: z.string().optional(),
            file: z.string().optional(),
            form_type: z.string().optional(),
            form_name: z.string().optional(),
        },
    }, ({ content, file, form_name }) => ({ content: [...handleResolve(file, content, form_name)] }));
    server.registerTool('evaluate', {
        description: 'Evaluate a workspace with fingerprint-keyed cache; returns cache-hit or stale diagnostics. Cache is process-local — not shared across concurrent server instances.',
        inputSchema: {
            file: z.string().optional(),
            resolve_id: z.string().optional(),
            mode: z.enum(['deterministic', 'incremental']).optional(),
        },
    }, ({ file, resolve_id, mode }) => ({ content: [...handleEvaluate(file, resolve_id, mode)] }));
    server.registerTool('project_lint_topology', {
        description: 'Report cross-file dependency/topology issues',
        inputSchema: { workspace: z.string().optional() },
    }, ({ workspace }) => ({ content: [...handleLintTopology(workspace)] }));
    server.registerTool('materialise_preflight', {
        description: 'Preflight a .cnj folder before materialisation',
        inputSchema: {
            folder: z.string(),
            project_name: z.string().optional(),
            entry_files: z.array(z.string()).optional(),
        },
    }, ({ folder, project_name, entry_files }) => ({ content: [...handlePreflight(folder, project_name, entry_files)] }));
};

/**
 * Semantic diff tools for cnj document pairs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { parse, toCnjModel } from '@conjurer/core';
import { isErr, entriesOfMap, intoMap } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
const ednToJson = (n) => {
    if (n.type === 'map') {
        return Object.fromEntries(entriesOfMap(n.entries).map(([k, v]) => [k, ednToJson(v)]));
    }
    if (n.type === 'list')
        return n.elements.map(ednToJson);
    if (n.type === 'number' || n.type === 'boolean')
        return n.value;
    if (n.type === 'nil')
        return null;
    if (n.type === 'string')
        return n.value;
    return n.type === 'keyword' ? n.value.substring(1) : n.value;
};
const diffScalar = (a, b) => a === b ? null : { before: a, after: b };
const diffStringArray = (a, b) => {
    const setA = intoMap(a.map((value) => [value, true]));
    const setB = intoMap(b.map((value) => [value, true]));
    return {
        added: b.filter((x) => !setA.has(x)),
        removed: a.filter((x) => !setB.has(x)),
    };
};
const toMapNode = (entries) => ({
    type: 'map',
    line: 0,
    column: 0,
    entries,
});
const decisionFingerprint = (d) => JSON.stringify(ednToJson(toMapNode(d)));
const diffDecisions = (a, b) => {
    const fpA = intoMap(a.map((value) => [decisionFingerprint(value), true]));
    const fpB = intoMap(b.map((value) => [decisionFingerprint(value), true]));
    const added = b.filter((d) => !fpA.has(decisionFingerprint(d)))
        .map((d) => ednToJson(toMapNode(d)));
    const removed = a.filter((d) => !fpB.has(decisionFingerprint(d)))
        .map((d) => ednToJson(toMapNode(d)));
    return { added, removed };
};
const diffCharter = (a, b) => ({
    title: diffScalar(a.title, b.title),
    version: diffScalar(a.version, b.version),
    goals: diffStringArray(a.goals, b.goals),
    decisions: diffDecisions(a.decisions, b.decisions),
    open: diffStringArray(a.open, b.open),
    references: diffStringArray(a.references, b.references),
});
const countDiff = (d) => d.added.length + d.removed.length;
const readDoc = (filePath) => {
    if (!existsSync(filePath))
        return `File not found: ${filePath}`;
    const src = readFileSync(filePath, 'utf8');
    const parsed = parse(src);
    if (isErr(parsed))
        return `Parse error in ${filePath}: ${parsed.error.message}`;
    const doc = toCnjModel(parsed.value, filePath);
    if (isErr(doc))
        return `Model error in ${filePath}: ${doc.error}`;
    return doc.value;
};
const candTotal = (c) => Array.from(c.scores.values()).reduce((a, b) => a + b, 0);
const candSummary = (c) => ({
    id: c.id, label: c.label, status: c.status, total_score: candTotal(c),
});
const diffCandidates = (docA, docB) => {
    const mapA = intoMap(docA.candidates.map((c) => [c.id, c]));
    const mapB = intoMap(docB.candidates.map((c) => [c.id, c]));
    const hoistMap = intoMap(docB.hoists.map((h) => [h.of, h]));
    const added = docB.candidates.filter((c) => !mapA.has(c.id)).map(candSummary);
    const removedOrHoisted = docA.candidates.filter((c) => !mapB.has(c.id));
    const hoisted = removedOrHoisted
        .filter((c) => hoistMap.has(c.id))
        .map((c) => {
        const h = hoistMap.get(c.id);
        return { id: c.id, label: c.label, hoist_date: h.date, into: h.into };
    });
    const removed = removedOrHoisted.filter((c) => !hoistMap.has(c.id)).map(candSummary);
    const shared = docA.candidates.filter((c) => mapB.has(c.id));
    const status_changes = shared
        .filter((a) => {
        const b = mapB.get(a.id);
        return b !== undefined && b.status !== a.status;
    })
        .map((a) => {
        const b = mapB.get(a.id);
        return { id: a.id, label: a.label, before: a.status, after: b.status };
    });
    /* eslint-disable functional/prefer-readonly-type, functional/immutable-data -- DEVIATION(2.2): local record accumulation confined to score-diff helper; no external mutation. */
    const score_changes = shared.flatMap((a) => {
        const b = mapB.get(a.id);
        const allKeys = new Set([...a.scores.keys(), ...b.scores.keys()]);
        const changes = {};
        for (const key of allKeys) {
            const before = a.scores.get(key) ?? 0;
            const after = b.scores.get(key) ?? 0;
            if (before !== after)
                changes[key] = { before, after };
        }
        if (Object.keys(changes).length === 0)
            return [];
        return [{ id: a.id, label: a.label, score_changes: changes, total_before: candTotal(a), total_after: candTotal(b) }];
    });
    /* eslint-enable functional/prefer-readonly-type, functional/immutable-data */
    return { added, removed, status_changes, score_changes, hoisted };
};
/**
 * Compute semantic differences in f/candidate backlog between two cnj files.
 *
 * @param pathA - Baseline file path.
 * @param pathB - Target file path.
 * @returns Tool text content payload.
 */
export const handleDiffCandidates = (pathA, pathB) => {
    const docA = readDoc(pathA);
    if (typeof docA === 'string')
        return toContent(docA);
    const docB = readDoc(pathB);
    if (typeof docB === 'string')
        return toContent(docB);
    const diff = diffCandidates(docA, docB);
    const changeCount = diff.added.length + diff.removed.length +
        diff.status_changes.length + diff.score_changes.length + diff.hoisted.length;
    return toContent(JSON.stringify({
        candidates: diff,
        summary: { has_changes: changeCount > 0, change_count: changeCount, graduation_count: diff.hoisted.length },
    }, null, 2));
};
/**
 * Compute semantic differences between two cnj files.
 *
 * @param pathA - Baseline file path.
 * @param pathB - Target file path.
 * @returns Tool text content payload.
 */
export const handleDiffCnj = (pathA, pathB) => {
    const docA = readDoc(pathA);
    if (typeof docA === 'string')
        return toContent(docA);
    const docB = readDoc(pathB);
    if (typeof docB === 'string')
        return toContent(docB);
    const charter = diffCharter(docA.charter, docB.charter);
    const targets = diffStringArray(docA.targets.map((t) => t.name), docB.targets.map((t) => t.name));
    const assets = diffStringArray(docA.assets.map((a) => a.name), docB.assets.map((a) => a.name));
    const changeCount = (charter.title !== null ? 1 : 0) +
        (charter.version !== null ? 1 : 0) +
        countDiff(charter.goals) +
        countDiff(charter.decisions) +
        countDiff(charter.open) +
        countDiff(charter.references) +
        countDiff(targets) +
        countDiff(assets);
    return toContent(JSON.stringify({
        charter,
        targets,
        assets,
        summary: { has_changes: changeCount > 0, change_count: changeCount },
    }, null, 2));
};
/**
 * Register semantic diff MCP tools.
 *
 * @param server - MCP server instance.
 * @returns No return value.
 */
export const registerDiffTools = (server) => {
    server.registerTool('diff_cnj', {
        description: 'Return a structured semantic diff between two .cnj files',
        inputSchema: { path_a: z.string(), path_b: z.string() },
    }, ({ path_a, path_b }) => ({ content: [...handleDiffCnj(path_a, path_b)] }));
    server.registerTool('diff_candidates', {
        description: 'Return a semantic diff of the f/candidate backlog between two .cnj snapshots: ' +
            'candidates added/removed, status changes, score deltas, and graduated candidates ' +
            '(present in A, hoisted in B). Keyed by stable :id.',
        inputSchema: { path_a: z.string().describe('Baseline .cnj path'), path_b: z.string().describe('Target .cnj path') },
    }, ({ path_a, path_b }) => ({ content: [...handleDiffCandidates(path_a, path_b)] }));
};

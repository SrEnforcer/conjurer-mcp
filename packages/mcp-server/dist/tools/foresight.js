/**
 * Foresight tools — list_candidates over workspace f/candidate forms.
 */
/* eslint-disable no-restricted-syntax -- DEVIATION(1.9): cluster grouping requires constructor-based Map at module boundary. */
/* eslint-disable functional/no-loop-statements -- DEVIATION(4.2): candidate grouping traversal requires explicit loop over workspace entries. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): local mutation is confined to ephemeral cluster accumulator. */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations in adapter code paths. */
import { resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { buildWorkspaceSnapshot } from '@conjurer/core';
import { isErr, isDefined } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
const totalScore = (c) => Array.from(c.scores.values()).reduce((a, b) => a + b, 0);
const HIDDEN_STATUSES = new Set(['hoisted', 'abandoned']);
const ACTIVE_STATUSES = new Set(['proposed', 'planned']);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) => {
    const a = new Date(from).getTime();
    const b = new Date(to).getTime();
    if (isNaN(a) || isNaN(b))
        return 0;
    return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
};
/**
 * List all f/candidate forms from workspace .cnj files, ranked for triage.
 *
 * @param file - Entry .cnj path; charter :references chains determine scope.
 * @param statusFilter - Filter by exact status; defaults to excluding hoisted/abandoned.
 * @param clusterFilter - Restrict results to one cluster.
 * @returns Tool text content payload.
 */
export const handleListCandidates = (file, statusFilter = undefined, clusterFilter = undefined) => {
    const abs = resolvePath(file);
    if (!existsSync(abs))
        return toContent(`File not found: ${file}`);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const all = Array.from(snapshot.files.values()).flatMap((entry) => entry.doc.candidates);
    const filtered = all
        .filter((c) => isDefined(statusFilter) ? c.status === statusFilter : !HIDDEN_STATUSES.has(c.status))
        .filter((c) => isDefined(clusterFilter) ? c.cluster === clusterFilter : true);
    // Group by :cluster; unclustered candidates get a synthetic group.
    const clusterMap = new Map();
    for (const c of filtered) {
        const key = c.cluster.length > 0 ? c.cluster : 'unclustered';
        const bucket = clusterMap.get(key) ?? [];
        clusterMap.set(key, [...bucket, c]);
    }
    // Build cluster views: within each cluster, descending total score.
    // Clusters themselves ordered by max total score so the most attractive
    // coherent group surfaces first.
    const clusters = Array.from(clusterMap.entries())
        .map(([cluster, members]) => {
        const sorted = [...members].sort((a, b) => totalScore(b) - totalScore(a));
        const totals = sorted.map(totalScore);
        const maxScore = totals[0] ?? 0;
        const meanScore = totals.length > 0
            ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
            : 0;
        return {
            cluster,
            max_score: maxScore,
            mean_score: meanScore,
            candidates: sorted.map((c) => ({
                id: c.id,
                label: c.label,
                status: c.status,
                total_score: totalScore(c),
                scores: Object.fromEntries(c.scores.entries()),
                added: c.added,
                rationale: c.rationale,
                conditions: c.conditions,
            })),
        };
    })
        .sort((a, b) => b.max_score - a.max_score);
    return toContent(JSON.stringify({ total_candidates: filtered.length, total_files_scanned: snapshot.files.size, clusters }, null, 2));
};
/**
 * Return a pre-decision triage briefing: candidates meeting a score threshold,
 * ranked by total score, with conditions surfaced verbatim.
 *
 * @param file - Entry .cnj path.
 * @param minScore - Minimum total score for inclusion; default 28.
 * @returns Tool text content payload.
 */
export const handleHoistReadiness = (file, minScore = 28) => {
    const abs = resolvePath(file);
    if (!existsSync(abs))
        return toContent(`File not found: ${file}`);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const today = todayISO();
    const all = Array.from(snapshot.files.values()).flatMap((entry) => entry.doc.candidates);
    const active = all.filter((c) => ACTIVE_STATUSES.has(c.status));
    const above = active.filter((c) => totalScore(c) >= minScore);
    const ranked = [...above].sort((a, b) => totalScore(b) - totalScore(a));
    const allTotals = active.map(totalScore).sort((a, b) => a - b);
    const mid = Math.floor(allTotals.length / 2);
    const medianTotal = allTotals.length > 0 ? (allTotals[mid] ?? 0) : 0;
    const candidates = ranked.map((c) => ({
        id: c.id,
        label: c.label,
        status: c.status,
        total_score: totalScore(c),
        scores: Object.fromEntries(c.scores.entries()),
        conditions: c.conditions,
        days_since_added: daysBetween(c.added, today),
        has_reassessment: c.history.length > 0,
    }));
    return toContent(JSON.stringify({
        min_score: minScore,
        candidates_above_threshold: candidates.length,
        total_active: active.length,
        total_files_scanned: snapshot.files.size,
        median_total_score: medianTotal,
        candidates_with_reassessment: active.filter((c) => c.history.length > 0).length,
        candidates,
    }, null, 2));
};
/**
 * Backlog maintenance diagnostics: stale candidates, thin rationale,
 * orphaned hoists, high-score/no-conditions gaps, lifecycle distribution.
 *
 * @param file - Entry .cnj path; charter :references chains determine scope.
 * @param staleDays - Days without reassessment before flagging as stale; default 30.
 * @param minRationaleLength - Minimum rationale character length; default 20.
 * @param highScoreThreshold - Total score above which empty :conditions is flagged; default 30.
 * @returns Tool text content payload.
 */
export const handleForesightHealth = (file, staleDays = 30, minRationaleLength = 20, highScoreThreshold = 30) => {
    const abs = resolvePath(file);
    if (!existsSync(abs))
        return toContent(`File not found: ${file}`);
    const snapshotRes = buildWorkspaceSnapshot(abs);
    if (isErr(snapshotRes))
        return toContent(`Workspace error: ${snapshotRes.error}`);
    const snapshot = snapshotRes.value;
    const today = todayISO();
    const allCandidates = Array.from(snapshot.files.values()).flatMap((e) => e.doc.candidates);
    const allHoists = Array.from(snapshot.files.values()).flatMap((e) => e.doc.hoists);
    const activeCandidates = allCandidates.filter((c) => ACTIVE_STATUSES.has(c.status));
    // DEVIATION(1.9): Set constructor at function body — no module-level accumulator required.
    const candidateIds = new Set(allCandidates.map((c) => c.id));
    const staleCandidates = activeCandidates
        .filter((c) => c.history.length === 0 && daysBetween(c.added, today) > staleDays)
        .map((c) => ({
        id: c.id, label: c.label,
        days_since_added: daysBetween(c.added, today),
        has_reassessment: false,
    }));
    const thinRationale = activeCandidates
        .filter((c) => c.rationale.length < minRationaleLength)
        .map((c) => ({ id: c.id, label: c.label, rationale_length: c.rationale.length }));
    const orphanedHoists = allHoists
        .filter((h) => !candidateIds.has(h.of))
        .map((h) => ({ of: h.of, date: h.date, into: h.into }));
    const highScoreNoConditions = activeCandidates
        .filter((c) => totalScore(c) >= highScoreThreshold && c.conditions.length === 0)
        .map((c) => ({ id: c.id, label: c.label, total_score: totalScore(c) }));
    const lifecycleDistribution = allCandidates.reduce((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {});
    const issueCount = staleCandidates.length +
        thinRationale.length +
        orphanedHoists.length +
        highScoreNoConditions.length;
    return toContent(JSON.stringify({
        consistent: issueCount === 0,
        issue_count: issueCount,
        stale_candidates: staleCandidates,
        thin_rationale: thinRationale,
        orphaned_hoists: orphanedHoists,
        high_score_no_conditions: highScoreNoConditions,
        lifecycle_distribution: lifecycleDistribution,
        total_candidates_scanned: allCandidates.length,
        total_hoists_scanned: allHoists.length,
        total_files_scanned: snapshot.files.size,
    }, null, 2));
};
export const registerForesightTools = (server) => {
    server.registerTool('lens_hoist_readiness', {
        description: 'Return a pre-decision triage briefing: active candidates meeting a score threshold, ' +
            'ranked by total score with conditions surfaced verbatim. Implements the foresight→r/decide ' +
            'handoff: the agent gets a structured briefing without claiming to know if conditions are met.',
        inputSchema: {
            file: z.string().describe('Path to the workspace entry .cnj'),
            min_score: z.number().int().min(1).max(40).optional().describe('Minimum total score — default 28'),
        },
    }, ({ file, min_score }) => ({ content: [...handleHoistReadiness(file, min_score)] }));
    server.registerTool('list_candidates', {
        description: 'List all f/candidate forms from workspace .cnj files, grouped by :cluster ' +
            'and sorted by descending total score within each group. Clusters ordered by ' +
            'their highest total so the most attractive coherent phase surfaces first.',
        inputSchema: {
            file: z.string().describe('Path to the workspace entry .cnj'),
            status: z.string().optional().describe(':proposed | :planned | :hoisted | :abandoned — omit to exclude hoisted and abandoned'),
            cluster: z.string().optional().describe('Restrict output to one cluster'),
        },
    }, ({ file, status, cluster }) => ({
        content: [...handleListCandidates(file, status, cluster)],
    }));
    server.registerTool('lens_foresight_health', {
        description: 'Backlog maintenance diagnostics: stale candidates, thin rationale, orphaned hoists, ' +
            'high-score/no-conditions gaps, and lifecycle distribution — the grimoire\'s own ' +
            'stated discipline made queryable as structured violations.',
        inputSchema: {
            file: z.string().describe('Path to the workspace entry .cnj'),
            stale_days: z.number().int().min(1).optional().describe('Days without reassessment before flagging as stale; default 30'),
            min_rationale_length: z.number().int().min(1).optional().describe('Minimum rationale character length; default 20'),
            high_score_threshold: z.number().int().min(1).max(40).optional().describe('Total score above which empty :conditions is flagged; default 30'),
        },
    }, ({ file, stale_days, min_rationale_length, high_score_threshold }) => ({
        content: [...handleForesightHealth(file, stale_days, min_rationale_length, high_score_threshold)],
    }));
};

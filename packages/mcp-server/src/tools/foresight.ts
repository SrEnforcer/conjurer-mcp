/**
 * Foresight tools — list_candidates over workspace f/candidate forms.
 */
/* eslint-disable no-restricted-syntax -- DEVIATION(1.9): cluster grouping requires constructor-based Map at module boundary. */
/* eslint-disable functional/no-loop-statements -- DEVIATION(4.2): candidate grouping traversal requires explicit loop over workspace entries. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): local mutation is confined to ephemeral cluster accumulator. */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations in adapter code paths. */
import { resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildWorkspaceSnapshot, effectiveScores } from '@conjurer/core';
import type { CnjCandidateForm, CnjHoist, WorkspaceSnapshot } from '@conjurer/core';
import { isErr, isDefined } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

const totalScore = (c: CnjCandidateForm): number =>
  Array.from(effectiveScores(c).values()).reduce((a, b) => a + b, 0);

const readSnapshot = (file: string): WorkspaceSnapshot | string => {
  const abs = resolvePath(file);
  if (!existsSync(abs)) return `File not found: ${file}`;

  const snapshotRes = buildWorkspaceSnapshot(abs);
  return isErr(snapshotRes) ? `Workspace error: ${snapshotRes.error}` : snapshotRes.value;
};

const allCandidates = (snapshot: WorkspaceSnapshot): ReadonlyArray<CnjCandidateForm> =>
  Array.from(snapshot.files.values()).flatMap((entry) => entry.doc.candidates);

const allHoists = (snapshot: WorkspaceSnapshot): ReadonlyArray<CnjHoist> =>
  Array.from(snapshot.files.values()).flatMap((entry) => entry.doc.hoists);

type CandidateView = {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly total_score: number;
  readonly scores: Record<string, number>;
  readonly added: string;
  readonly rationale: string;
  readonly conditions: ReadonlyArray<string>;
};

type ClusterView = {
  readonly cluster: string;
  readonly max_score: number;
  readonly mean_score: number;
  readonly candidates: ReadonlyArray<CandidateView>;
};

const HIDDEN_STATUSES = new Set<string>(['hoisted', 'abandoned']);

const ACTIVE_STATUSES = new Set<string>(['proposed', 'planned']);

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number => {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
};

const filterCandidates = (
  candidates: ReadonlyArray<CnjCandidateForm>,
  statusFilter: string | undefined,
  clusterFilter: string | undefined,
): ReadonlyArray<CnjCandidateForm> =>
  candidates
    .filter((candidate) =>
      isDefined(statusFilter) ? candidate.status === statusFilter : !HIDDEN_STATUSES.has(candidate.status))
    .filter((candidate) => isDefined(clusterFilter) ? candidate.cluster === clusterFilter : true);

const clusterKey = (candidate: CnjCandidateForm): string =>
  candidate.cluster.length > 0 ? candidate.cluster : 'unclustered';

const buildClusterMap = (
  candidates: ReadonlyArray<CnjCandidateForm>,
): ReadonlyMap<string, ReadonlyArray<CnjCandidateForm>> => {
  const clusterMap = new Map<string, Array<CnjCandidateForm>>();
  for (const candidate of candidates) {
    const key = clusterKey(candidate);
    const bucket = clusterMap.get(key) ?? [];
    clusterMap.set(key, [...bucket, candidate]);
  }
  return clusterMap;
};

const toCandidateView = (candidate: CnjCandidateForm): CandidateView => ({
  id: candidate.id,
  label: candidate.label,
  status: candidate.status,
  total_score: totalScore(candidate),
  scores: Object.fromEntries(effectiveScores(candidate).entries()),
  added: candidate.added,
  rationale: candidate.rationale,
  conditions: candidate.conditions,
});

const toClusterView = (
  cluster: string,
  members: ReadonlyArray<CnjCandidateForm>,
): ClusterView => {
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
    candidates: sorted.map(toCandidateView),
  };
};

const clusterViews = (candidates: ReadonlyArray<CnjCandidateForm>): ReadonlyArray<ClusterView> =>
  Array.from(buildClusterMap(candidates).entries())
    .map(([cluster, members]) => toClusterView(cluster, members))
    .sort((a, b) => b.max_score - a.max_score);

const medianTotalScore = (candidates: ReadonlyArray<CnjCandidateForm>): number => {
  const totals = candidates.map(totalScore).sort((a, b) => a - b);
  const mid = Math.floor(totals.length / 2);
  return totals.length > 0 ? (totals[mid] ?? 0) : 0;
};

const toHoistReadinessEntry = (
  candidate: CnjCandidateForm,
  today: string,
): HoistReadinessEntry => ({
  id: candidate.id,
  label: candidate.label,
  status: candidate.status,
  total_score: totalScore(candidate),
  scores: Object.fromEntries(effectiveScores(candidate).entries()),
  conditions: candidate.conditions,
  days_since_added: daysBetween(candidate.added, today),
  has_reassessment: candidate.history.length > 0,
});

/**
 * List all f/candidate forms from workspace .cnj files, ranked for triage.
 *
 * @param file - Entry .cnj path; charter :references chains determine scope.
 * @param statusFilter - Filter by exact status; defaults to excluding hoisted/abandoned.
 * @param clusterFilter - Restrict results to one cluster.
 * @returns Tool text content payload.
 */
export const handleListCandidates = (
  file: string,
  statusFilter: string | undefined = undefined,
  clusterFilter: string | undefined = undefined,
): ToolContent => {
  const snapshot = readSnapshot(file);
  if (typeof snapshot === 'string') return toContent(snapshot);

  const filtered = filterCandidates(allCandidates(snapshot), statusFilter, clusterFilter);
  const clusters = clusterViews(filtered);

  return toContent(
    JSON.stringify(
      { total_candidates: filtered.length, total_files_scanned: snapshot.files.size, clusters },
      null,
      2,
    ),
  );
};

type HoistReadinessEntry = {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly total_score: number;
  readonly scores: Record<string, number>;
  readonly conditions: ReadonlyArray<string>;
  readonly days_since_added: number;
  readonly has_reassessment: boolean;
};

/**
 * Return a pre-decision triage briefing: candidates meeting a score threshold,
 * ranked by total score, with conditions surfaced verbatim.
 *
 * @param file - Entry .cnj path.
 * @param minScore - Minimum total score for inclusion; default 28.
 * @returns Tool text content payload.
 */
export const handleHoistReadiness = (file: string, minScore: number = 28): ToolContent => {
  const snapshot = readSnapshot(file);
  if (typeof snapshot === 'string') return toContent(snapshot);

  const today = todayISO();
  const active = allCandidates(snapshot).filter((candidate) => ACTIVE_STATUSES.has(candidate.status));
  const above = active.filter((c) => totalScore(c) >= minScore);
  const ranked = [...above].sort((a, b) => totalScore(b) - totalScore(a));
  const candidates = ranked.map((candidate) => toHoistReadinessEntry(candidate, today));

  return toContent(JSON.stringify({
    min_score: minScore,
    candidates_above_threshold: candidates.length,
    total_active: active.length,
    total_files_scanned: snapshot.files.size,
    median_total_score: medianTotalScore(active),
    candidates_with_reassessment: active.filter((c) => c.history.length > 0).length,
    candidates,
  }, null, 2));
};

type StaleEntry = { readonly id: string; readonly label: string; readonly days_since_added: number; readonly has_reassessment: boolean };
type ThinEntry = { readonly id: string; readonly label: string; readonly rationale_length: number };
type OrphanEntry = { readonly of: string; readonly date: string; readonly into: string };
type HighScoreEntry = { readonly id: string; readonly label: string; readonly total_score: number };
type ForesightHealthOptions = {
  readonly staleDays: number;
  readonly minRationaleLength: number;
  readonly highScoreThreshold: number;
};

type ForesightIssueSets = {
  readonly candidates: ReadonlyArray<CnjCandidateForm>;
  readonly hoists: ReadonlyArray<CnjHoist>;
  readonly staleCandidates: ReadonlyArray<StaleEntry>;
  readonly thinRationale: ReadonlyArray<ThinEntry>;
  readonly orphanedHoists: ReadonlyArray<OrphanEntry>;
  readonly highScoreNoConditions: ReadonlyArray<HighScoreEntry>;
};

const defaultForesightHealthOptions: ForesightHealthOptions = {
  staleDays: 30,
  minRationaleLength: 20,
  highScoreThreshold: 30,
};

const staleEntries = (
  candidates: ReadonlyArray<CnjCandidateForm>,
  staleDays: number,
  today: string,
): ReadonlyArray<StaleEntry> =>
  candidates
    .filter((candidate) => candidate.history.length === 0 && daysBetween(candidate.added, today) > staleDays)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      days_since_added: daysBetween(candidate.added, today),
      has_reassessment: false,
    }));

const thinRationaleEntries = (
  candidates: ReadonlyArray<CnjCandidateForm>,
  minRationaleLength: number,
): ReadonlyArray<ThinEntry> =>
  candidates
    .filter((candidate) => candidate.rationale.length < minRationaleLength)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      rationale_length: candidate.rationale.length,
    }));

const highScoreNoConditionEntries = (
  candidates: ReadonlyArray<CnjCandidateForm>,
  highScoreThreshold: number,
): ReadonlyArray<HighScoreEntry> =>
  candidates
    .filter((candidate) => totalScore(candidate) >= highScoreThreshold && candidate.conditions.length === 0)
    .map((candidate) => ({ id: candidate.id, label: candidate.label, total_score: totalScore(candidate) }));

const lifecycleDistribution = (candidates: ReadonlyArray<CnjCandidateForm>): Record<string, number> =>
  candidates.reduce<Record<string, number>>(
    (acc, candidate) => ({ ...acc, [candidate.status]: (acc[candidate.status] ?? 0) + 1 }),
    {},
  );

const orphanedHoistEntries = (
  hoists: ReadonlyArray<CnjHoist>,
  candidates: ReadonlyArray<CnjCandidateForm>,
): ReadonlyArray<OrphanEntry> => {
  // DEVIATION(1.9): Constructing small local Set/Date objects inside pure diagnostic or diff helpers where no prelude equivalent exists and no mutable state escapes.
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  return hoists
    .filter((hoist) => !candidateIds.has(hoist.of))
    .map((hoist) => ({ of: hoist.of, date: hoist.date, into: hoist.into }));
};

const issueCountOf = (
  issues: {
    readonly staleCandidates: ReadonlyArray<StaleEntry>;
    readonly thinRationale: ReadonlyArray<ThinEntry>;
    readonly orphanedHoists: ReadonlyArray<OrphanEntry>;
    readonly highScoreNoConditions: ReadonlyArray<HighScoreEntry>;
  },
): number =>
  issues.staleCandidates.length +
  issues.thinRationale.length +
  issues.orphanedHoists.length +
  issues.highScoreNoConditions.length;

const collectForesightIssues = (
  snapshot: WorkspaceSnapshot,
  config: ForesightHealthOptions,
): ForesightIssueSets => {
  const today = todayISO();
  const candidates = allCandidates(snapshot);
  const hoists = allHoists(snapshot);
  const activeCandidates = candidates.filter((candidate) => ACTIVE_STATUSES.has(candidate.status));
  return {
    candidates,
    hoists,
    staleCandidates: staleEntries(activeCandidates, config.staleDays, today),
    thinRationale: thinRationaleEntries(activeCandidates, config.minRationaleLength),
    orphanedHoists: orphanedHoistEntries(hoists, candidates),
    highScoreNoConditions: highScoreNoConditionEntries(activeCandidates, config.highScoreThreshold),
  };
};

const buildForesightHealthPayload = (
  snapshot: WorkspaceSnapshot,
  config: ForesightHealthOptions,
): {
  readonly consistent: boolean;
  readonly issue_count: number;
  readonly stale_candidates: ReadonlyArray<StaleEntry>;
  readonly thin_rationale: ReadonlyArray<ThinEntry>;
  readonly orphaned_hoists: ReadonlyArray<OrphanEntry>;
  readonly high_score_no_conditions: ReadonlyArray<HighScoreEntry>;
  readonly lifecycle_distribution: Record<string, number>;
  readonly total_candidates_scanned: number;
  readonly total_hoists_scanned: number;
  readonly total_files_scanned: number;
} => {
  const issues = collectForesightIssues(snapshot, config);
  const issueCount = issueCountOf({
    staleCandidates: issues.staleCandidates,
    thinRationale: issues.thinRationale,
    orphanedHoists: issues.orphanedHoists,
    highScoreNoConditions: issues.highScoreNoConditions,
  });

  return {
    consistent: issueCount === 0,
    issue_count: issueCount,
    stale_candidates: issues.staleCandidates,
    thin_rationale: issues.thinRationale,
    orphaned_hoists: issues.orphanedHoists,
    high_score_no_conditions: issues.highScoreNoConditions,
    lifecycle_distribution: lifecycleDistribution(issues.candidates),
    total_candidates_scanned: issues.candidates.length,
    total_hoists_scanned: issues.hoists.length,
    total_files_scanned: snapshot.files.size,
  };
};

const toForesightHealthOptions = (
  staleDays: number | undefined,
  minRationaleLength: number | undefined,
  highScoreThreshold: number | undefined,
): Partial<ForesightHealthOptions> => ({
  ...(staleDays !== undefined ? { staleDays } : {}),
  ...(minRationaleLength !== undefined ? { minRationaleLength } : {}),
  ...(highScoreThreshold !== undefined ? { highScoreThreshold } : {}),
});

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
export const handleForesightHealth = (
  file: string,
  options: Partial<ForesightHealthOptions> = {},
): ToolContent => {
  const snapshot = readSnapshot(file);
  if (typeof snapshot === 'string') return toContent(snapshot);

  const config = { ...defaultForesightHealthOptions, ...options };
  return toContent(JSON.stringify(buildForesightHealthPayload(snapshot, config), null, 2));
};

const registerHoistReadinessTool = (server: McpServer): void => {
  server.registerTool(
    'lens_hoist_readiness',
    {
      description:
        'Return a pre-decision triage briefing: active candidates meeting a score threshold, ' +
        'ranked by total score with conditions surfaced verbatim. Implements the foresight→r/decide ' +
        'handoff: the agent gets a structured briefing without claiming to know if conditions are met.',
      inputSchema: {
        file: z.string().describe('Path to the workspace entry .cnj'),
        min_score: z.number().int().min(1).max(40).optional().describe('Minimum total score — default 28'),
      },
    },
    ({ file, min_score }) => ({ content: [...handleHoistReadiness(file, min_score)] }),
  );
};

const registerListCandidatesTool = (server: McpServer): void => {
  server.registerTool(
    'list_candidates',
    {
      description:
        'List all f/candidate forms from workspace .cnj files, grouped by :cluster ' +
        'and sorted by descending total score within each group. Clusters ordered by ' +
        'their highest total so the most attractive coherent phase surfaces first.',
      inputSchema: {
        file: z.string().describe('Path to the workspace entry .cnj'),
        status: z.string().optional().describe(':proposed | :planned | :hoisted | :abandoned — omit to exclude hoisted and abandoned'),
        cluster: z.string().optional().describe('Restrict output to one cluster'),
      },
    },
    ({ file, status, cluster }) => ({
      content: [...handleListCandidates(file, status, cluster)],
    }),
  );
};

const registerForesightHealthTool = (server: McpServer): void => {
  server.registerTool(
    'lens_foresight_health',
    {
      description:
        'Backlog maintenance diagnostics: stale candidates, thin rationale, orphaned hoists, ' +
        'high-score/no-conditions gaps, and lifecycle distribution — the grimoire\'s own ' +
        'stated discipline made queryable as structured violations.',
      inputSchema: {
        file: z.string().describe('Path to the workspace entry .cnj'),
        stale_days: z.number().int().min(1).optional().describe('Days without reassessment before flagging as stale; default 30'),
        min_rationale_length: z.number().int().min(1).optional().describe('Minimum rationale character length; default 20'),
        high_score_threshold: z.number().int().min(1).max(40).optional().describe('Total score above which empty :conditions is flagged; default 30'),
      },
    },
    ({ file, stale_days, min_rationale_length, high_score_threshold }) => ({
      content: [...handleForesightHealth(
        file,
        toForesightHealthOptions(stale_days, min_rationale_length, high_score_threshold),
      )],
    }),
  );
};

export const registerForesightTools = (server: McpServer): void => {
  registerHoistReadinessTool(server);
  registerListCandidatesTool(server);
  registerForesightHealthTool(server);
};

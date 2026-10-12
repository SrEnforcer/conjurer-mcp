/**
 * Foresight backlog diagnostics, shared by the MCP server and the VS Code extension.
 *
 * Pure: the current date is a parameter, so results do not depend on when they are computed.
 */
import { effectiveScores } from './candidate-scores.js';
import type { CnjCandidateForm, CnjHoist } from './cnj-model.js';

/** Statuses of candidates still in deliberation. */
export const ACTIVE_CANDIDATE_STATUSES: ReadonlyArray<string> = ['proposed', 'planned'];

/** Thresholds and the reference date for a health check. */
export type ForesightHealthOptions = {
  readonly staleDays: number;
  readonly minRationaleLength: number;
  readonly highScoreThreshold: number;
  /** Reference date, `YYYY-MM-DD`. */
  readonly today: string;
};

export type StaleCandidate = { readonly id: string; readonly label: string; readonly days_since_added: number; readonly has_reassessment: boolean };
export type ThinRationale = { readonly id: string; readonly label: string; readonly rationale_length: number };
export type OrphanedHoist = { readonly of: string; readonly date: string; readonly into: string };
export type HighScoreNoConditions = { readonly id: string; readonly label: string; readonly total_score: number };

/** The result of a foresight health check. */
export type ForesightHealthReport = {
  readonly stale_candidates: ReadonlyArray<StaleCandidate>;
  readonly thin_rationale: ReadonlyArray<ThinRationale>;
  readonly orphaned_hoists: ReadonlyArray<OrphanedHoist>;
  readonly high_score_no_conditions: ReadonlyArray<HighScoreNoConditions>;
  readonly lifecycle_distribution: Readonly<Record<string, number>>;
  readonly issue_count: number;
};

/**
 * Today's date in `YYYY-MM-DD`, for callers at the I/O edge.
 *
 * @returns The current UTC date.
 */
// DEVIATION(1.9): the clock is read here, at the I/O edge, and passed into pure checks as a value.
// eslint-disable-next-line no-restricted-syntax
export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/**
 * Whole days from one ISO date to another, never negative; 0 when either date is unreadable.
 *
 * @param from - Earlier date, `YYYY-MM-DD`.
 * @param to - Later date, `YYYY-MM-DD`.
 * @returns The number of whole days between them.
 */
export const daysBetween = (from: string, to: string): number => {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
};

/**
 * Sum of a candidate's effective scores (base scores with reassessments replayed).
 *
 * @param candidate - The candidate.
 * @returns The total score.
 */
export const candidateTotal = (candidate: CnjCandidateForm): number =>
  Array.from(effectiveScores(candidate).values()).reduce((a, b) => a + b, 0);

const isActive = (candidate: CnjCandidateForm): boolean => ACTIVE_CANDIDATE_STATUSES.includes(candidate.status);

const staleOf = (active: ReadonlyArray<CnjCandidateForm>, opts: ForesightHealthOptions): ReadonlyArray<StaleCandidate> =>
  active
    .filter((c) => c.history.length === 0 && daysBetween(c.added, opts.today) > opts.staleDays)
    .map((c) => ({ id: c.id, label: c.label, days_since_added: daysBetween(c.added, opts.today), has_reassessment: false }));

const thinOf = (active: ReadonlyArray<CnjCandidateForm>, opts: ForesightHealthOptions): ReadonlyArray<ThinRationale> =>
  active
    .filter((c) => c.rationale.length < opts.minRationaleLength)
    .map((c) => ({ id: c.id, label: c.label, rationale_length: c.rationale.length }));

const orphansOf = (hoists: ReadonlyArray<CnjHoist>, candidates: ReadonlyArray<CnjCandidateForm>): ReadonlyArray<OrphanedHoist> => {
  const ids = candidates.map((c) => c.id);
  return hoists.filter((h) => !ids.includes(h.of)).map((h) => ({ of: h.of, date: h.date, into: h.into }));
};

const highScoreOf = (active: ReadonlyArray<CnjCandidateForm>, opts: ForesightHealthOptions): ReadonlyArray<HighScoreNoConditions> =>
  active
    .filter((c) => candidateTotal(c) >= opts.highScoreThreshold && c.conditions.length === 0)
    .map((c) => ({ id: c.id, label: c.label, total_score: candidateTotal(c) }));

const distributionOf = (candidates: ReadonlyArray<CnjCandidateForm>): Readonly<Record<string, number>> =>
  candidates.reduce<Readonly<Record<string, number>>>(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
    {},
  );

/**
 * Check a foresight backlog against the grimoire's own discipline: stale and thinly argued
 * candidates, hoists without a candidate, high scores without conditions.
 *
 * @param candidates - All candidates in scope, with their current status.
 * @param hoists - All `f/hoist` forms in scope.
 * @param opts - Thresholds and the reference date.
 * @returns The diagnostics and their total count.
 */
export const computeForesightHealth = (
  candidates: ReadonlyArray<CnjCandidateForm>,
  hoists: ReadonlyArray<CnjHoist>,
  opts: ForesightHealthOptions,
): ForesightHealthReport => {
  const active = candidates.filter(isActive);
  const stale = staleOf(active, opts);
  const thin = thinOf(active, opts);
  const orphans = orphansOf(hoists, candidates);
  const highScore = highScoreOf(active, opts);
  return {
    stale_candidates: stale,
    thin_rationale: thin,
    orphaned_hoists: orphans,
    high_score_no_conditions: highScore,
    lifecycle_distribution: distributionOf(candidates),
    issue_count: stale.length + thin.length + orphans.length + highScore.length,
  };
};

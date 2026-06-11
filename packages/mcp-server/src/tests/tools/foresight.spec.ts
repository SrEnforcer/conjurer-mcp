/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): inline assertion helper shapes in tests prioritize readability over readonly wrappers. */
import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElse } from '@tsfpp/prelude';
import { handleListCandidates, handleHoistReadiness, handleForesightHealth } from '../../tools/foresight.js';
import { parseFirstToolObject } from './tool-json.js';

const CHARTER = '(charter "P" :version "1.0.0" :goals ["g"])';

const withCandidates = (candidates: string): string =>
  `${CHARTER}\n${candidates}`;

const CAND_A = `
(f/candidate :alpha
  :label "Alpha feature"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :proposed
  :scores {:feasibility 8 :elegance 9 :containment 7 :value 9}
  :rationale "High value, low risk. Deferred pending parser work.")`;

const CAND_B = `
(f/candidate :beta
  :label "Beta feature"
  :cluster :cluster-x
  :added "2026-01-15"
  :status :proposed
  :scores {:feasibility 5 :elegance 7 :containment 6 :value 6}
  :rationale "Useful but lower priority."
  :conditions ["alpha is hoisted first"])`;

const CAND_HOISTED = `
(f/candidate :done
  :label "Done feature"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :hoisted
  :scores {:feasibility 9 :elegance 9 :containment 9 :value 9}
  :rationale "Implemented.")`;

const CAND_OTHER_CLUSTER = `
(f/candidate :gamma
  :label "Gamma feature"
  :cluster :cluster-y
  :added "2026-02-01"
  :status :proposed
  :scores {:feasibility 9 :elegance 8 :containment 9 :value 7}
  :rationale "Different cluster.")`;

const CAND_WITH_HISTORY = `
(f/candidate :with-history
  :label "Has reassessment"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :planned
  :scores {:feasibility 8 :elegance 9 :containment 8 :value 9}
  :rationale "High value."
  :history [
    (f/reassess :of :with-history
      :date "2026-03-01"
      :scores {:feasibility 9}
      :rationale "Dependency landed."
      :status :planned)])`;

const CAND_LOW_SCORE = `
(f/candidate :low-score
  :label "Low score candidate"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :proposed
  :scores {:feasibility 3 :elegance 4 :containment 3 :value 4}
  :rationale "Low priority.")`;

// ── health check virtual fixtures ───────────────────────────────────────────

// Stale: no :history, added 60 days before 2026-06-10 (test date env is not frozen,
// so we use a date far enough in the past that even with test drift it stays stale).
const CAND_STALE = `
(f/candidate :stale-one
  :label "Stale candidate"
  :cluster :cluster-x
  :added "2020-01-01"
  :status :proposed
  :scores {:feasibility 6 :elegance 7 :containment 6 :value 7}
  :rationale "Old and unreviewed — definitely stale.")`;

// Thin rationale (length < 20).
const CAND_THIN = `
(f/candidate :thin-one
  :label "Thin rationale"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 5 :elegance 6 :containment 5 :value 6}
  :rationale "Too short.")`;

// High score (32) with no conditions.
const CAND_HIGH_NO_COND = `
(f/candidate :high-no-cond
  :label "High score no conditions"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 8 :elegance 8 :containment 8 :value 8}
  :rationale "Strong candidate with no guard conditions specified.")`;

// Healthy: recent, adequate rationale, moderate score, has conditions.
const CAND_HEALTHY = `
(f/candidate :healthy-one
  :label "Healthy candidate"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Reasonable rationale text that is long enough."
  :conditions ["dependency X ships first"])`;

// Hoist whose :of matches CAND_HEALTHY (not orphaned).
const HOIST_VALID = `
(f/hoist :of :healthy-one
  :date "2026-06-05"
  :into "decision/healthy-implemented"
  :outcomes ["shipped"])`;

// Hoist whose :of has no matching candidate (orphaned).
const HOIST_ORPHAN = `
(f/hoist :of :nonexistent-candidate
  :date "2026-06-05"
  :into "decision/something"
  :outcomes ["done"])`;

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/foresight/main.cnj': withCandidates(`${CAND_A}${CAND_B}${CAND_HOISTED}${CAND_OTHER_CLUSTER}`),
  '/vfs/foresight/empty.cnj': CHARTER,
  '/vfs/foresight/planned.cnj': withCandidates(`
(f/candidate :planned-one
  :label "Planned one"
  :cluster :cluster-z
  :added "2026-03-01"
  :status :planned
  :scores {:feasibility 7 :elegance 8 :containment 8 :value 8}
  :rationale "Scheduled.")`),
  '/vfs/foresight/triage.cnj': withCandidates(`${CAND_A}${CAND_LOW_SCORE}${CAND_WITH_HISTORY}`),
  // health check fixtures
  '/vfs/foresight/healthy.cnj': `${CHARTER}\n${CAND_HEALTHY}\n${HOIST_VALID}`,
  '/vfs/foresight/stale.cnj': `${CHARTER}\n${CAND_STALE}`,
  '/vfs/foresight/thin.cnj': `${CHARTER}\n${CAND_THIN}`,
  '/vfs/foresight/high-no-cond.cnj': `${CHARTER}\n${CAND_HIGH_NO_COND}`,
  '/vfs/foresight/orphan-hoist.cnj': `${CHARTER}\n${CAND_HEALTHY}\n${HOIST_ORPHAN}`,
  '/vfs/foresight/all-issues.cnj': `${CHARTER}\n${CAND_STALE}\n${CAND_THIN}\n${CAND_HIGH_NO_COND}\n${HOIST_ORPHAN}`,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElse(() => '')(fromNullable(virtualFiles[path])),
}));

describe('handleListCandidates — missing file', () => {
  it('returns error for missing file', () => {
    const r = handleListCandidates('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleListCandidates — default filter (excludes hoisted/abandoned)', () => {
  it('excludes hoisted candidates by default', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates).toBe(3); // alpha, beta, gamma (not done)
  });

  it('returns total_files_scanned', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_files_scanned).toBe(1);
  });
});

describe('handleListCandidates — cluster grouping and score sorting', () => {
  it('groups candidates by cluster', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    const clusterNames: Array<string> = d.clusters.map((c: { cluster: string }) => c.cluster);
    expect(clusterNames).toContain('cluster-x');
    expect(clusterNames).toContain('cluster-y');
  });

  it('sorts candidates within a cluster by descending total score', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    const cx = d.clusters.find((c: { cluster: string }) => c.cluster === 'cluster-x');
    // alpha total = 8+9+7+9 = 33; beta total = 5+7+6+6 = 24
    expect(cx.candidates[0].id).toBe('alpha');
    expect(cx.candidates[0].total_score).toBe(33);
    expect(cx.candidates[1].id).toBe('beta');
    expect(cx.candidates[1].total_score).toBe(24);
  });

  it('orders clusters by max total score descending', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    // cluster-y has gamma: 9+8+9+7 = 33; cluster-x max is alpha: 33
    // ties resolved by iteration order — either is fine; both should appear
    expect(d.clusters.length).toBe(2);
    expect(d.clusters[0].max_score).toBeGreaterThanOrEqual(d.clusters[1].max_score);
  });

  it('includes scores map on each candidate', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    const cx = d.clusters.find((c: { cluster: string }) => c.cluster === 'cluster-x');
    const alpha = cx.candidates[0];
    expect(alpha.scores.feasibility).toBe(8);
    expect(alpha.scores.elegance).toBe(9);
  });
});

describe('handleListCandidates — status filter', () => {
  it('returns only hoisted when status=hoisted', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj', 'hoisted');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates).toBe(1);
    expect(d.clusters[0].candidates[0].id).toBe('done');
  });

  it('returns only proposed when status=proposed', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj', 'proposed');
    const d = parseFirstToolObject(r);
    const ids: Array<string> = d.clusters.flatMap((c: { candidates: Array<{ id: string }> }) =>
      c.candidates.map((cand) => cand.id),
    );
    expect(ids).toContain('alpha');
    expect(ids).toContain('beta');
    expect(ids).not.toContain('done');
  });
});

describe('handleListCandidates — cluster filter', () => {
  it('restricts output to the specified cluster', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj', undefined, 'cluster-y');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates).toBe(1);
    expect(d.clusters.length).toBe(1);
    expect(d.clusters[0].cluster).toBe('cluster-y');
  });
});

describe('handleListCandidates — empty workspace', () => {
  it('returns zero candidates for a file with no f/candidate forms', () => {
    const r = handleListCandidates('/vfs/foresight/empty.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates).toBe(0);
    expect(d.clusters).toEqual([]);
  });
});

describe('handleHoistReadiness — threshold filtering', () => {
  it('returns error for missing file', () => {
    const r = handleHoistReadiness('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });

  it('includes candidates above default threshold (28)', () => {
    // alpha total = 33, with-history total = 34 — both above 28
    // low-score total = 14 — below 28
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    expect(d.candidates_above_threshold).toBe(2);
    const ids: Array<string> = d.candidates.map((c: { id: string }) => c.id);
    expect(ids).toContain('alpha');
    expect(ids).toContain('with-history');
    expect(ids).not.toContain('low-score');
  });

  it('ranks candidates by descending total score', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    // with-history (34) should precede alpha (33)
    expect(d.candidates[0].id).toBe('with-history');
    expect(d.candidates[1].id).toBe('alpha');
  });

  it('respects a custom min_score', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj', 34);
    const d = parseFirstToolObject(r);
    expect(d.candidates_above_threshold).toBe(1);
    expect(d.candidates[0].id).toBe('with-history');
  });

  it('excludes hoisted candidates regardless of score', () => {
    // CAND_HOISTED has :status :hoisted — must not appear
    const r = handleHoistReadiness('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    const ids: Array<string> = d.candidates.map((c: { id: string }) => c.id);
    expect(ids).not.toContain('done');
  });

  it('surfaces conditions verbatim', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    const alpha = d.candidates.find((c: { id: string }) => c.id === 'alpha');
    expect(alpha).toBeDefined();
    // CAND_A has no conditions — empty array
    expect(alpha.conditions).toEqual([]);
  });

  it('reports has_reassessment=true for candidates with :history', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    const withHist = d.candidates.find((c: { id: string }) => c.id === 'with-history');
    expect(withHist.has_reassessment).toBe(true);
    const alpha = d.candidates.find((c: { id: string }) => c.id === 'alpha');
    expect(alpha.has_reassessment).toBe(false);
  });

  it('includes workspace stats', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_active).toBe(3); // alpha, low-score, with-history (all active)
    expect(d.total_files_scanned).toBe(1);
    expect(typeof d.median_total_score).toBe('number');
    expect(d.candidates_with_reassessment).toBe(1);
  });
});

describe('handleListCandidates — conditions surfaced', () => {
  it('includes conditions on candidates that have them', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    const cx = d.clusters.find((c: { cluster: string }) => c.cluster === 'cluster-x');
    const beta = cx.candidates.find((c: { id: string }) => c.id === 'beta');
    expect(beta.conditions).toContain('alpha is hoisted first');
  });
});

// ── handleForesightHealth ────────────────────────────────────────────────────

describe('handleForesightHealth — file access', () => {
  it('returns error for missing file', () => {
    const r = handleForesightHealth('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleForesightHealth — consistent workspace', () => {
  it('reports consistent=true for a healthy single-candidate file', () => {
    // CAND_HEALTHY: recent, good rationale, low score (20), has conditions — all checks pass
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.consistent).toBe(true);
    expect(d.issue_count).toBe(0);
    expect(d.stale_candidates).toHaveLength(0);
    expect(d.thin_rationale).toHaveLength(0);
    expect(d.orphaned_hoists).toHaveLength(0);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });

  it('reports non-orphaned hoist as absent from orphaned_hoists', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.orphaned_hoists).toHaveLength(0);
  });
});

describe('handleForesightHealth — stale candidates', () => {
  it('flags candidates with no reassessment older than stale_days', () => {
    // CAND_STALE added 2020-01-01 — vastly older than default 30 days
    const r = handleForesightHealth('/vfs/foresight/stale.cnj');
    const d = parseFirstToolObject(r);
    expect(d.stale_candidates).toHaveLength(1);
    expect(d.stale_candidates[0].id).toBe('stale-one');
    expect(d.stale_candidates[0].days_since_added).toBeGreaterThan(30);
    expect(d.stale_candidates[0].has_reassessment).toBe(false);
  });

  it('does not flag recent candidates without reassessment', () => {
    // CAND_HEALTHY added 2026-06-01 — within default 30 days of 2026-06-10
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.stale_candidates).toHaveLength(0);
  });

  it('does not flag candidates that have a reassessment regardless of age', () => {
    // CAND_WITH_HISTORY in triage.cnj has :history — should not be stale
    const r = handleForesightHealth('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    const staleIds: Array<string> = d.stale_candidates.map((c: { id: string }) => c.id);
    expect(staleIds).not.toContain('with-history');
  });
});

describe('handleForesightHealth — thin rationale', () => {
  it('flags candidates whose rationale is below min_rationale_length', () => {
    // CAND_THIN rationale = "Too short." (10 chars) — below default 20
    const r = handleForesightHealth('/vfs/foresight/thin.cnj');
    const d = parseFirstToolObject(r);
    expect(d.thin_rationale).toHaveLength(1);
    expect(d.thin_rationale[0].id).toBe('thin-one');
    expect(d.thin_rationale[0].rationale_length).toBe(10);
  });

  it('does not flag candidates with adequate rationale', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.thin_rationale).toHaveLength(0);
  });

  it('respects a custom min_rationale_length', () => {
    // CAND_HEALTHY rationale is ~45 chars; flag it with a high threshold
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', 30, 100);
    const d = parseFirstToolObject(r);
    expect(d.thin_rationale).toHaveLength(1);
    expect(d.thin_rationale[0].id).toBe('healthy-one');
  });
});

describe('handleForesightHealth — orphaned hoists', () => {
  it('flags hoists whose :of has no matching candidate :id', () => {
    const r = handleForesightHealth('/vfs/foresight/orphan-hoist.cnj');
    const d = parseFirstToolObject(r);
    expect(d.orphaned_hoists).toHaveLength(1);
    expect(d.orphaned_hoists[0].of).toBe('nonexistent-candidate');
  });

  it('does not flag hoists that have a matching candidate', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.orphaned_hoists).toHaveLength(0);
  });
});

describe('handleForesightHealth — high score / no conditions', () => {
  it('flags active candidates with total_score >= threshold and empty conditions', () => {
    // CAND_HIGH_NO_COND: score 32, no conditions
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj');
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(1);
    expect(d.high_score_no_conditions[0].id).toBe('high-no-cond');
    expect(d.high_score_no_conditions[0].total_score).toBe(32);
  });

  it('does not flag candidates that have conditions', () => {
    // CAND_HEALTHY has conditions
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });

  it('respects a custom high_score_threshold', () => {
    // CAND_HIGH_NO_COND score=32; set threshold to 35 — should not be flagged
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj', 30, 20, 35);
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });
});

describe('handleForesightHealth — lifecycle distribution', () => {
  it('returns counts per status including hoisted candidates', () => {
    // main.cnj: alpha(proposed), beta(proposed), done(hoisted), gamma(proposed)
    const r = handleForesightHealth('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.lifecycle_distribution.proposed).toBe(3);
    expect(d.lifecycle_distribution.hoisted).toBe(1);
  });

  it('returns an empty distribution for a file with no candidates', () => {
    const r = handleForesightHealth('/vfs/foresight/empty.cnj');
    const d = parseFirstToolObject(r);
    expect(Object.keys(d.lifecycle_distribution)).toHaveLength(0);
  });
});

describe('handleForesightHealth — workspace stats', () => {
  it('reports total_candidates_scanned and total_files_scanned', () => {
    const r = handleForesightHealth('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates_scanned).toBe(4); // alpha, beta, done, gamma
    expect(d.total_files_scanned).toBe(1);
    expect(d.total_hoists_scanned).toBe(0);
  });
});

describe('handleForesightHealth — multiple issues', () => {
  it('accumulates all issue types in one call', () => {
    // all-issues.cnj: stale + thin + high-no-cond + orphan-hoist
    const r = handleForesightHealth('/vfs/foresight/all-issues.cnj');
    const d = parseFirstToolObject(r);
    expect(d.consistent).toBe(false);
    expect(d.stale_candidates.length).toBeGreaterThanOrEqual(1);
    expect(d.thin_rationale.length).toBeGreaterThanOrEqual(1);
    expect(d.orphaned_hoists.length).toBeGreaterThanOrEqual(1);
    expect(d.high_score_no_conditions.length).toBeGreaterThanOrEqual(1);
    expect(d.issue_count).toBeGreaterThanOrEqual(4);
  });
});

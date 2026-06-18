/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): inline assertion helper shapes in tests prioritize readability over readonly wrappers. */
import './foresight-fixtures.js';
import { describe, it, expect } from 'vitest';
import { handleListCandidates, handleHoistReadiness } from '../../tools/foresight.js';
import { parseFirstToolObject } from './tool-json.js';

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

describe('handleHoistReadiness — file access and thresholds', () => {
  it('returns error for missing file', () => {
    const r = handleHoistReadiness('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });

  it('includes candidates above default threshold (28)', () => {
    // alpha total = 33, with-history effective total = 35 (feasibility 8→9 via reassessment) — both above 28
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
    // with-history effective (35) should precede alpha (33)
    expect(d.candidates[0].id).toBe('with-history');
    expect(d.candidates[1].id).toBe('alpha');
  });

  it('respects a custom min_score', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj', 34);
    const d = parseFirstToolObject(r);
    expect(d.candidates_above_threshold).toBe(1);
    expect(d.candidates[0].id).toBe('with-history');
  });
});

describe('handleHoistReadiness — candidate selection', () => {
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
});

describe('handleHoistReadiness — workspace stats', () => {
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

import './foresight-fixtures.js';
import { describe, it, expect } from 'vitest';
import { handleListCandidates, handleHoistReadiness } from '../../tools/foresight.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const Conditions = z.array(z.string());
const ListCandidatesSchema = z.looseObject({
  total_candidates: z.number(),
  total_files_scanned: z.number(),
  clusters: z.array(z.looseObject({
    cluster: z.string(),
    max_score: z.number(),
    candidates: z.array(z.looseObject({
      id: z.string(),
      total_score: z.number(),
      conditions: Conditions,
      scores: z.looseObject({ feasibility: z.number(), elegance: z.number(), containment: z.number(), value: z.number() }),
    })),
  })),
});

const HoistReadinessSchema = z.looseObject({
  candidates_above_threshold: z.number(),
  total_active: z.number(),
  total_files_scanned: z.number(),
  median_total_score: z.number().nullable(),
  candidates_with_reassessment: z.number(),
  candidates: z.array(z.looseObject({ id: z.string(), conditions: Conditions, has_reassessment: z.boolean() })),
});

describe('handleListCandidates — missing file', () => {
  it('returns error for missing file', () => {
    const r = handleListCandidates('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleListCandidates — default filter (excludes hoisted/abandoned)', () => {
  it('excludes hoisted candidates by default', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    expect(d.total_candidates).toBe(3); // alpha, beta, gamma (not done)
  });

  it('returns total_files_scanned', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    expect(d.total_files_scanned).toBe(1);
  });
});

describe('handleListCandidates — cluster grouping and score sorting', () => {
  it('groups candidates by cluster', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    const clusterNames = d.clusters.map((c) => c.cluster);
    expect(clusterNames).toContain('cluster-x');
    expect(clusterNames).toContain('cluster-y');
  });

  it('sorts candidates within a cluster by descending total score', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    const cx = d.clusters.find((c) => c.cluster === 'cluster-x');
    // alpha total = 8+9+7+9 = 33; beta total = 5+7+6+6 = 24
    expect(cx?.candidates[0]?.id).toBe('alpha');
    expect(cx?.candidates[0]?.total_score).toBe(33);
    expect(cx?.candidates[1]?.id).toBe('beta');
    expect(cx?.candidates[1]?.total_score).toBe(24);
  });

  it('orders clusters by max total score descending', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    // cluster-y has gamma: 9+8+9+7 = 33; cluster-x max is alpha: 33
    // ties resolved by iteration order — either is fine; both should appear
    const [first, second] = d.clusters;
    if (first === undefined || second === undefined) return expect.unreachable('expected two clusters');
    expect(d.clusters.length).toBe(2);
    expect(first.max_score).toBeGreaterThanOrEqual(second.max_score);
  });

  it('includes scores map on each candidate', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    const cx = d.clusters.find((c) => c.cluster === 'cluster-x');
    const alpha = cx?.candidates[0];
    expect(alpha?.scores.feasibility).toBe(8);
    expect(alpha?.scores.elegance).toBe(9);
  });
});

describe('handleListCandidates — status filter', () => {
  it('returns only hoisted when status=hoisted', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj', 'hoisted');
    const d = parseToolJson(r, ListCandidatesSchema);
    expect(d.total_candidates).toBe(1);
    expect(d.clusters[0]?.candidates[0]?.id).toBe('done');
  });

  it('returns only proposed when status=proposed', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj', 'proposed');
    const d = parseToolJson(r, ListCandidatesSchema);
    const ids = d.clusters.flatMap((c) =>
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
    const d = parseToolJson(r, ListCandidatesSchema);
    expect(d.total_candidates).toBe(1);
    expect(d.clusters.length).toBe(1);
    expect(d.clusters[0]?.cluster).toBe('cluster-y');
  });
});

describe('handleListCandidates — empty workspace', () => {
  it('returns zero candidates for a file with no f/candidate forms', () => {
    const r = handleListCandidates('/vfs/foresight/empty.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
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
    const d = parseToolJson(r, HoistReadinessSchema);
    expect(d.candidates_above_threshold).toBe(2);
    const ids = d.candidates.map((c) => c.id);
    expect(ids).toContain('alpha');
    expect(ids).toContain('with-history');
    expect(ids).not.toContain('low-score');
  });

  it('ranks candidates by descending total score', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseToolJson(r, HoistReadinessSchema);
    // with-history effective (35) should precede alpha (33)
    expect(d.candidates[0]?.id).toBe('with-history');
    expect(d.candidates[1]?.id).toBe('alpha');
  });

  it('respects a custom min_score', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj', 34);
    const d = parseToolJson(r, HoistReadinessSchema);
    expect(d.candidates_above_threshold).toBe(1);
    expect(d.candidates[0]?.id).toBe('with-history');
  });
});

describe('handleHoistReadiness — candidate selection', () => {
  it('excludes hoisted candidates regardless of score', () => {
    // CAND_HOISTED has :status :hoisted — must not appear
    const r = handleHoistReadiness('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, HoistReadinessSchema);
    const ids = d.candidates.map((c) => c.id);
    expect(ids).not.toContain('done');
  });

  it('surfaces conditions verbatim', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseToolJson(r, HoistReadinessSchema);
    const alpha = d.candidates.find((c) => c.id === 'alpha');
    expect(alpha).toBeDefined();
    // CAND_A has no conditions — empty array
    expect(alpha?.conditions).toEqual([]);
  });

  it('reports has_reassessment=true for candidates with :history', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseToolJson(r, HoistReadinessSchema);
    const withHist = d.candidates.find((c) => c.id === 'with-history');
    expect(withHist?.has_reassessment).toBe(true);
    const alpha = d.candidates.find((c) => c.id === 'alpha');
    expect(alpha?.has_reassessment).toBe(false);
  });
});

describe('handleHoistReadiness — workspace stats', () => {
  it('includes workspace stats', () => {
    const r = handleHoistReadiness('/vfs/foresight/triage.cnj');
    const d = parseToolJson(r, HoistReadinessSchema);
    expect(d.total_active).toBe(3); // alpha, low-score, with-history (all active)
    expect(d.total_files_scanned).toBe(1);
    expect(typeof d.median_total_score).toBe('number');
    expect(d.candidates_with_reassessment).toBe(1);
  });
});

describe('handleListCandidates — conditions surfaced', () => {
  it('includes conditions on candidates that have them', () => {
    const r = handleListCandidates('/vfs/foresight/main.cnj');
    const d = parseToolJson(r, ListCandidatesSchema);
    const cx = d.clusters.find((c) => c.cluster === 'cluster-x');
    const beta = cx?.candidates.find((c) => c.id === 'beta');
    expect(beta?.conditions).toContain('alpha is hoisted first');
  });
});

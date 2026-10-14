import './foresight-fixtures.js';
import { describe, it, expect } from 'vitest';
import { handleForesightHealth } from '../../tools/foresight.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const ForesightHealthSchema = z.looseObject({
  consistent: z.boolean(),
  issue_count: z.number(),
  stale_candidates: z.array(z.looseObject({ id: z.string(), days_since_added: z.number(), has_reassessment: z.boolean() })),
  thin_rationale: z.array(z.looseObject({ id: z.string(), rationale_length: z.number() })),
  orphaned_hoists: z.array(z.looseObject({ of: z.string() })),
  high_score_no_conditions: z.array(z.looseObject({ id: z.string(), total_score: z.number() })),
  lifecycle_distribution: z.record(z.string(), z.number()),
  total_candidates_scanned: z.number(),
  total_files_scanned: z.number(),
  total_hoists_scanned: z.number(),
  unreadable_files: z.array(z.looseObject({ path: z.string(), reason: z.string() })),
});

// Fixtures are dated June 2026; health is checked against a fixed date so results never age.
const TODAY = '2026-06-15';

describe('handleForesightHealth — file access', () => {
  it('returns error for missing file', () => {
    const r = handleForesightHealth('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleForesightHealth — consistent workspace', () => {
  it('reports consistent=true for a healthy single-candidate file', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.consistent).toBe(true);
    expect(d.issue_count).toBe(0);
    expect(d.stale_candidates).toHaveLength(0);
    expect(d.thin_rationale).toHaveLength(0);
    expect(d.orphaned_hoists).toHaveLength(0);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });

  it('reports non-orphaned hoist as absent from orphaned_hoists', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.orphaned_hoists).toHaveLength(0);
  });
});

describe('handleForesightHealth — stale candidates', () => {
  it('flags candidates with no reassessment older than stale_days', () => {
    const r = handleForesightHealth('/vfs/foresight/stale.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.stale_candidates).toHaveLength(1);
    expect(d.stale_candidates[0]?.id).toBe('stale-one');
    expect(d.stale_candidates[0]?.days_since_added).toBeGreaterThan(30);
    expect(d.stale_candidates[0]?.has_reassessment).toBe(false);
  });

  it('does not flag recent candidates without reassessment', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.stale_candidates).toHaveLength(0);
  });

  it('does not flag candidates that have a reassessment regardless of age', () => {
    const r = handleForesightHealth('/vfs/foresight/triage.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    const staleIds = d.stale_candidates.map((c) => c.id);
    expect(staleIds).not.toContain('with-history');
  });
});

describe('handleForesightHealth — rationale and conditions', () => {
  it('flags candidates whose rationale is below min_rationale_length', () => {
    const r = handleForesightHealth('/vfs/foresight/thin.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.thin_rationale).toHaveLength(1);
    expect(d.thin_rationale[0]?.id).toBe('thin-one');
    expect(d.thin_rationale[0]?.rationale_length).toBe(10);
  });

  it('does not flag candidates with adequate rationale', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.thin_rationale).toHaveLength(0);
  });
});

describe('handleForesightHealth — threshold options', () => {
  it('respects a custom min_rationale_length', () => {
    // orphan-hoist.cnj holds the healthy candidate without a hoist naming it, so it is still active.
    const r = handleForesightHealth('/vfs/foresight/orphan-hoist.cnj', { staleDays: 30, minRationaleLength: 100, today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.thin_rationale).toHaveLength(1);
    expect(d.thin_rationale[0]?.id).toBe('healthy-one');
  });

  it('flags active candidates with total_score >= threshold and empty conditions', () => {
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.high_score_no_conditions).toHaveLength(1);
    expect(d.high_score_no_conditions[0]?.id).toBe('high-no-cond');
    expect(d.high_score_no_conditions[0]?.total_score).toBe(32);
  });

  it('does not flag candidates that have conditions', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });

  it('respects a custom high_score_threshold', () => {
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj', {
      staleDays: 30,
      minRationaleLength: 20,
      highScoreThreshold: 35,
    });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });
});

describe('handleForesightHealth — hoists and stats', () => {
  it('flags hoists whose :of has no matching candidate :id', () => {
    const r = handleForesightHealth('/vfs/foresight/orphan-hoist.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.orphaned_hoists).toHaveLength(1);
    expect(d.orphaned_hoists[0]?.of).toBe('nonexistent-candidate');
  });

  it('returns counts per status including hoisted candidates', () => {
    const r = handleForesightHealth('/vfs/foresight/main.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.lifecycle_distribution['proposed']).toBe(3);
    expect(d.lifecycle_distribution['hoisted']).toBe(1);
  });

  it('reports total_candidates_scanned and total_files_scanned', () => {
    const r = handleForesightHealth('/vfs/foresight/main.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.total_candidates_scanned).toBe(4);
    expect(d.total_files_scanned).toBe(1);
    expect(d.total_hoists_scanned).toBe(0);
  });

  it('accumulates all issue types in one call', () => {
    const r = handleForesightHealth('/vfs/foresight/all-issues.cnj', { today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.consistent).toBe(false);
    expect(d.stale_candidates.length).toBeGreaterThanOrEqual(1);
    expect(d.thin_rationale.length).toBeGreaterThanOrEqual(1);
    expect(d.orphaned_hoists.length).toBeGreaterThanOrEqual(1);
    expect(d.high_score_no_conditions.length).toBeGreaterThanOrEqual(1);
    expect(d.issue_count).toBeGreaterThanOrEqual(4);
  });
});

describe('handleForesightHealth — current status from f/hoist', () => {
  it('counts a candidate named by an f/hoist as hoisted and leaves it out of the active checks', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { minRationaleLength: 100, today: TODAY });
    const d = parseToolJson(r, ForesightHealthSchema);
    expect(d.lifecycle_distribution).toEqual({ hoisted: 1 });
    expect(d.thin_rationale).toHaveLength(0);
  });
});

describe('handleForesightHealth — unreadable referenced files', () => {
  it('is not consistent when a referenced file could not be read, even with no backlog issues', () => {
    const d = parseToolJson(handleForesightHealth('/vfs/foresight/partref.cnj', { today: TODAY }), ForesightHealthSchema);
    expect(d.issue_count).toBe(0);
    expect(d.unreadable_files.map((u) => u.path)).toEqual(['/vfs/foresight/broken.cnj']);
    expect(d.consistent).toBe(false);
  });

  it('stays consistent for the same backlog when every file reads', () => {
    const d = parseToolJson(handleForesightHealth('/vfs/foresight/healthy.cnj', { today: TODAY }), ForesightHealthSchema);
    expect(d.unreadable_files).toEqual([]);
    expect(d.consistent).toBe(true);
  });
});

/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): inline assertion helper shapes in tests prioritize readability over readonly wrappers. */
import './foresight-fixtures.js';
import { describe, it, expect } from 'vitest';
import { handleForesightHealth } from '../../tools/foresight.js';
import { parseFirstToolObject } from './tool-json.js';

describe('handleForesightHealth — file access', () => {
  it('returns error for missing file', () => {
    const r = handleForesightHealth('/vfs/foresight/missing.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleForesightHealth — consistent workspace', () => {
  it('reports consistent=true for a healthy single-candidate file', () => {
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
    const r = handleForesightHealth('/vfs/foresight/stale.cnj');
    const d = parseFirstToolObject(r);
    expect(d.stale_candidates).toHaveLength(1);
    expect(d.stale_candidates[0].id).toBe('stale-one');
    expect(d.stale_candidates[0].days_since_added).toBeGreaterThan(30);
    expect(d.stale_candidates[0].has_reassessment).toBe(false);
  });

  it('does not flag recent candidates without reassessment', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.stale_candidates).toHaveLength(0);
  });

  it('does not flag candidates that have a reassessment regardless of age', () => {
    const r = handleForesightHealth('/vfs/foresight/triage.cnj');
    const d = parseFirstToolObject(r);
    const staleIds: Array<string> = d.stale_candidates.map((c: { id: string }) => c.id);
    expect(staleIds).not.toContain('with-history');
  });
});

describe('handleForesightHealth — rationale and conditions', () => {
  it('flags candidates whose rationale is below min_rationale_length', () => {
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
});

describe('handleForesightHealth — threshold options', () => {
  it('respects a custom min_rationale_length', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj', { staleDays: 30, minRationaleLength: 100 });
    const d = parseFirstToolObject(r);
    expect(d.thin_rationale).toHaveLength(1);
    expect(d.thin_rationale[0].id).toBe('healthy-one');
  });

  it('flags active candidates with total_score >= threshold and empty conditions', () => {
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj');
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(1);
    expect(d.high_score_no_conditions[0].id).toBe('high-no-cond');
    expect(d.high_score_no_conditions[0].total_score).toBe(32);
  });

  it('does not flag candidates that have conditions', () => {
    const r = handleForesightHealth('/vfs/foresight/healthy.cnj');
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });

  it('respects a custom high_score_threshold', () => {
    const r = handleForesightHealth('/vfs/foresight/high-no-cond.cnj', {
      staleDays: 30,
      minRationaleLength: 20,
      highScoreThreshold: 35,
    });
    const d = parseFirstToolObject(r);
    expect(d.high_score_no_conditions).toHaveLength(0);
  });
});

describe('handleForesightHealth — hoists and stats', () => {
  it('flags hoists whose :of has no matching candidate :id', () => {
    const r = handleForesightHealth('/vfs/foresight/orphan-hoist.cnj');
    const d = parseFirstToolObject(r);
    expect(d.orphaned_hoists).toHaveLength(1);
    expect(d.orphaned_hoists[0].of).toBe('nonexistent-candidate');
  });

  it('returns counts per status including hoisted candidates', () => {
    const r = handleForesightHealth('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.lifecycle_distribution.proposed).toBe(3);
    expect(d.lifecycle_distribution.hoisted).toBe(1);
  });

  it('reports total_candidates_scanned and total_files_scanned', () => {
    const r = handleForesightHealth('/vfs/foresight/main.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_candidates_scanned).toBe(4);
    expect(d.total_files_scanned).toBe(1);
    expect(d.total_hoists_scanned).toBe(0);
  });

  it('accumulates all issue types in one call', () => {
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
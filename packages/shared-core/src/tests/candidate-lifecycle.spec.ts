import { describe, it, expect } from 'vitest';
import { isOk } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import { toCnjModel } from '../cnj-model.js';
import { computeForesightHealth } from '../foresight-health.js';
import type { CnjDocument } from '../cnj-model.js';

const parseDoc = (src: string): CnjDocument | undefined => {
  const r = parse(src);
  if (!isOk(r)) return undefined;
  const m = toCnjModel(r.value, 'test.cnj');
  return isOk(m) ? m.value : undefined;
};

const CANDIDATE = `(f/candidate :diff-intent
  :label "x/diff-intent — drift detection"
  :added "2026-06-07"
  :status :proposed
  :scores {:feasibility 6 :elegance 8 :containment 7 :value 8}
  :rationale "Comparing a recovered spec against the authored one is the next step."
  :conditions ["exhume validated again"]
  :history [(f/reassess :of :diff-intent :date "2026-08-14" :scores {:feasibility 9}
              :rationale "x/recover-stack proved stable." :status :planned)])`;

describe('candidate lifecycle (foresight.md · f/reassess)', () => {
  it('reads the current status from the latest reassessment and keeps the authored one', () => {
    const doc = parseDoc(CANDIDATE);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const [candidate] = doc.candidates;
    expect(candidate?.status).toBe('planned');
    expect(candidate?.authoredStatus).toBe('proposed');
  });

  it('merges standalone f/reassess forms into the history in date order', () => {
    const doc = parseDoc(`${CANDIDATE}
      (f/reassess :of :diff-intent :date "2026-10-02" :scores {:value 9}
        :rationale "A second team consumes recovered .cnj files." :status :proposed)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const [candidate] = doc.candidates;
    expect(candidate?.history.map((r) => r.date)).toEqual(['2026-08-14', '2026-10-02']);
    expect(candidate?.status).toBe('proposed');
    expect(doc.reassessments).toHaveLength(1);
  });

  it('marks a candidate hoisted once an f/hoist names it, whatever its history says', () => {
    const doc = parseDoc(`${CANDIDATE}
      (f/hoist :of :diff-intent :date "2026-11-20" :into :decision/x-diff-intent-accepted)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    expect(doc.candidates[0]?.status).toBe('hoisted');
    expect(doc.candidates[0]?.authoredStatus).toBe('proposed');
  });
});

describe('computeForesightHealth', () => {
  const doc = parseDoc(`${CANDIDATE}
    (f/candidate :old-idea :label "Old idea" :added "2026-01-01" :status :proposed
      :scores {:feasibility 9 :elegance 9 :containment 9 :value 9}
      :rationale "short")
    (f/hoist :of :never-recorded :date "2026-06-01" :into :decision/x)`);
  const opts = { staleDays: 30, minRationaleLength: 20, highScoreThreshold: 30, today: '2026-06-15' };

  it('depends on the reference date, not on the clock', () => {
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = computeForesightHealth(doc.candidates, doc.hoists, opts);
    expect(report.stale_candidates.map((s) => [s.id, s.days_since_added])).toEqual([['old-idea', 165]]);
    expect(report.thin_rationale.map((s) => s.id)).toEqual(['old-idea']);
    expect(report.orphaned_hoists.map((s) => s.of)).toEqual(['never-recorded']);
    expect(report.high_score_no_conditions.map((s) => s.id)).toEqual(['old-idea']);
    expect(report.issue_count).toBe(4);
  });

  it('scores candidates with their reassessments replayed', () => {
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = computeForesightHealth(doc.candidates, doc.hoists, { ...opts, highScoreThreshold: 32 });
    // diff-intent: 6+8+7+8 = 29 written, 9+8+7+8 = 32 after the August reassessment; it has conditions.
    expect(report.high_score_no_conditions.map((s) => s.id)).toEqual(['old-idea']);
    expect(report.lifecycle_distribution).toEqual({ planned: 1, proposed: 1 });
  });
});

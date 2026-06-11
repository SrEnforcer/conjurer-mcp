/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): test fixture construction uses mutable shapes for clarity. */
import { describe, it, expect } from 'vitest';
import { computeHealthIssues } from '../providers/status-bar.js';
import { parse, toCnjModel } from '@conjurer/core';
import type { WorkspaceSnapshot, ParsedFileEntry } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

// Build a real ParsedFileEntry from raw EDN so tests use the actual parser/model.
const makeEntry = (src: string, filePath = '/test/test.cnj'): ParsedFileEntry => {
  const parsed = parse(src);
  if (isErr(parsed)) throw new Error(`parse error: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) throw new Error(`model error: ${doc.error}`);
  return { path: filePath, content: src, doc: doc.value, directRefs: [] };
};

const makeSnapshot = (...srcs: string[]): WorkspaceSnapshot => ({
  files: new Map(srcs.map((src, i) => {
    const path = `/test/file${i}.cnj`;
    return [path, makeEntry(src, path)];
  })),
  targetEdges: new Map(),
  cycleDetected: false,
});

const CHARTER = '(charter "P" :version "1.0.0" :goals ["g"])';

const STALE = `${CHARTER}
(f/candidate :stale-one
  :label "Stale candidate"
  :cluster :x
  :added "2020-01-01"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Old and unreviewed — definitely stale by any measure.")`;

const THIN = `${CHARTER}
(f/candidate :thin-one
  :label "Thin rationale"
  :cluster :x
  :added "2026-06-10"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Too short.")`;

const HIGH_NO_COND = `${CHARTER}
(f/candidate :high-one
  :label "High score no conditions"
  :cluster :x
  :added "2026-06-10"
  :status :proposed
  :scores {:feasibility 8 :elegance 8 :containment 8 :value 8}
  :rationale "Strong candidate with no guard conditions specified — should be flagged.")`;

const HEALTHY = `${CHARTER}
(f/candidate :healthy-one
  :label "Healthy candidate"
  :cluster :x
  :added "2026-06-10"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :conditions ["dep X ships first"]
  :rationale "Reasonable rationale that is long enough to pass the length check.")`;

const ORPHAN_HOIST = `${CHARTER}
(f/candidate :healthy-one
  :label "Healthy candidate"
  :cluster :x
  :added "2026-06-10"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :conditions ["dep X ships first"]
  :rationale "Reasonable rationale that is long enough.")
(f/hoist :of :nonexistent-candidate
  :date "2026-06-10"
  :into "decision/something"
  :outcomes ["done"]
  :note "orphan")`;

describe('computeHealthIssues — healthy workspace', () => {
  it('returns empty for a workspace with no issues', () => {
    const issues = computeHealthIssues(makeSnapshot(HEALTHY));
    expect(issues).toHaveLength(0);
  });

  it('returns empty for an empty snapshot (no files)', () => {
    const snapshot: WorkspaceSnapshot = { files: new Map(), targetEdges: new Map(), cycleDetected: false };
    expect(computeHealthIssues(snapshot)).toHaveLength(0);
  });
});

describe('computeHealthIssues — stale candidates', () => {
  it('flags a candidate with no reassessment added years ago', () => {
    const issues = computeHealthIssues(makeSnapshot(STALE));
    expect(issues.some((i) => i.kind === 'stale' && i.id === 'stale-one')).toBe(true);
  });

  it('does not flag a recently added candidate', () => {
    const issues = computeHealthIssues(makeSnapshot(HEALTHY));
    expect(issues.some((i) => i.kind === 'stale')).toBe(false);
  });

  it('does not flag a hoisted candidate', () => {
    const src = `${CHARTER}
(f/candidate :done-one
  :label "Done"
  :cluster :x
  :added "2020-01-01"
  :status :hoisted
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Long enough rationale that should not cause thin issues.")`;
    const issues = computeHealthIssues(makeSnapshot(src));
    expect(issues.some((i) => i.kind === 'stale')).toBe(false);
  });
});

describe('computeHealthIssues — thin rationale', () => {
  it('flags a candidate whose rationale is below 20 chars', () => {
    const issues = computeHealthIssues(makeSnapshot(THIN));
    expect(issues.some((i) => i.kind === 'thin_rationale' && i.id === 'thin-one')).toBe(true);
  });

  it('includes the rationale length in the detail', () => {
    const issues = computeHealthIssues(makeSnapshot(THIN));
    const issue = issues.find((i) => i.kind === 'thin_rationale');
    expect(issue?.detail).toMatch(/chars < 20/);
  });

  it('does not flag a candidate with adequate rationale', () => {
    const issues = computeHealthIssues(makeSnapshot(HEALTHY));
    expect(issues.some((i) => i.kind === 'thin_rationale')).toBe(false);
  });
});

describe('computeHealthIssues — orphaned hoists', () => {
  it('flags a hoist whose :of has no matching candidate', () => {
    const issues = computeHealthIssues(makeSnapshot(ORPHAN_HOIST));
    expect(issues.some((i) => i.kind === 'orphaned_hoist' && i.id === 'nonexistent-candidate')).toBe(true);
  });

  it('does not flag a hoist whose :of matches a present candidate', () => {
    const src = `${CHARTER}
(f/candidate :real-one
  :label "Real candidate"
  :cluster :x
  :added "2026-06-10"
  :status :hoisted
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Long enough rationale text to pass validation.")
(f/hoist :of :real-one
  :date "2026-06-10"
  :into "decision/real"
  :outcomes ["shipped"]
  :note "legitimate")`;
    const issues = computeHealthIssues(makeSnapshot(src));
    expect(issues.some((i) => i.kind === 'orphaned_hoist')).toBe(false);
  });
});

describe('computeHealthIssues — high score / no conditions', () => {
  it('flags an active candidate with score >= 30 and no conditions', () => {
    const issues = computeHealthIssues(makeSnapshot(HIGH_NO_COND));
    expect(issues.some((i) => i.kind === 'high_score_no_conditions' && i.id === 'high-one')).toBe(true);
  });

  it('includes the score in the detail', () => {
    const issues = computeHealthIssues(makeSnapshot(HIGH_NO_COND));
    const issue = issues.find((i) => i.kind === 'high_score_no_conditions');
    expect(issue?.detail).toMatch(/score 32/);
  });

  it('does not flag a candidate below the threshold', () => {
    const issues = computeHealthIssues(makeSnapshot(HEALTHY));
    expect(issues.some((i) => i.kind === 'high_score_no_conditions')).toBe(false);
  });
});

describe('computeHealthIssues — multi-file workspace', () => {
  it('accumulates issues from all files in the snapshot', () => {
    const issues = computeHealthIssues(makeSnapshot(STALE, HIGH_NO_COND));
    expect(issues.some((i) => i.kind === 'stale')).toBe(true);
    expect(issues.some((i) => i.kind === 'high_score_no_conditions')).toBe(true);
  });
});

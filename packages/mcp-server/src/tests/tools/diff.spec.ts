/* eslint-disable max-lines-per-function -- DEVIATION(3.4): table-driven assertion blocks are intentionally colocated for diff readability in tests. */
import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElseOption } from '@tsfpp/prelude';
import { handleDiffCnj, handleDiffCandidates } from '../../tools/diff.js';
import { parseFirstToolObject } from './tool-json.js';

const A = [
  '(charter "Proj" :version "0.9.0" :goals ["keep this" "remove this"]',
  '  :decisions [{:date "2026-01-01" :decision "first decision"}]',
  '  :open ["old question"]',
  '  :references ["other.cnj"])',
  '(asset "core-lib" :type :library :applies-to [])',
  '(target "shared-core" :language :typescript :standard :tsf-plus-plus :produces [:library] :modules [])',
].join('\n');

const B = [
  '(charter "Proj" :version "1.0.0" :goals ["keep this" "new goal"]',
  '  :decisions [{:date "2026-01-01" :decision "first decision"} {:date "2026-06-09" :decision "second decision"}]',
  '  :open ["new question"]',
  '  :references ["other.cnj"])',
  '(target "shared-core" :language :typescript :standard :tsf-plus-plus :produces [:library] :modules [])',
  '(target "mcp-server" :language :typescript :standard :tsf-plus-plus :produces [:binary] :modules [] :from "shared-core")',
].join('\n');

const IDENTICAL = A;

const CHARTER_ONLY = '(charter "P" :version "1.0.0")';

const BACKLOG_A = [
  CHARTER_ONLY,
  '(f/candidate :alpha :label "Alpha" :cluster :c :added "2026-01-01" :status :proposed',
  '  :scores {:feasibility 8 :elegance 9 :containment 7 :value 9} :rationale "r")',
  '(f/candidate :beta  :label "Beta"  :cluster :c :added "2026-01-15" :status :proposed',
  '  :scores {:feasibility 5 :elegance 7 :containment 6 :value 6} :rationale "r")',
].join('\n');

// B: alpha hoisted, beta promoted to :planned, gamma added, alpha score unchanged but hoisted
const BACKLOG_B = [
  CHARTER_ONLY,
  '(f/candidate :beta  :label "Beta"  :cluster :c :added "2026-01-15" :status :planned',
  '  :scores {:feasibility 5 :elegance 7 :containment 6 :value 7} :rationale "r")',
  '(f/candidate :gamma :label "Gamma" :cluster :d :added "2026-06-01" :status :proposed',
  '  :scores {:feasibility 9 :elegance 8 :containment 9 :value 7} :rationale "r")',
  '(f/hoist :of :alpha :date "2026-06-10" :into :decision/alpha-accepted :outcomes [:impl] :note "Done.")',
].join('\n');

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/diff/a.cnj': A,
  '/vfs/diff/b.cnj': B,
  '/vfs/diff/same.cnj': IDENTICAL,
  '/vfs/diff/backlog-a.cnj': BACKLOG_A,
  '/vfs/diff/backlog-b.cnj': BACKLOG_B,
  '/vfs/diff/backlog-same.cnj': BACKLOG_A,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElseOption(() => '')(fromNullable(virtualFiles[path])),
}));

describe('handleDiffCnj', () => {
  it('returns error when path_a does not exist', () => {
    const r = handleDiffCnj('/vfs/diff/missing.cnj', '/vfs/diff/b.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('returns error when path_b does not exist', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/missing.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('reports no changes for identical files', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/same.cnj');
    const d = parseFirstToolObject(r);
    expect(d.summary.has_changes).toBe(false);
    expect(d.summary.change_count).toBe(0);
  });

  it('detects version change', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.version.before).toBe('0.9.0');
    expect(d.charter.version.after).toBe('1.0.0');
  });

  it('reports null scalar change when value is unchanged', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.title).toBeNull();
  });

  it('detects removed goal', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.goals.removed).toContain('remove this');
  });

  it('detects added goal', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.goals.added).toContain('new goal');
  });

  it('keeps goals present in both as unchanged', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.goals.added).not.toContain('keep this');
    expect(d.charter.goals.removed).not.toContain('keep this');
  });

  it('detects added decision', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.decisions.added).toHaveLength(1);
    expect(d.charter.decisions.added[0].date).toBe('2026-06-09');
  });

  it('detects added open question', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.open.added).toContain('new question');
    expect(d.charter.open.removed).toContain('old question');
  });

  it('detects removed asset', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.assets.removed).toContain('core-lib');
  });

  it('detects added target', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.targets.added).toContain('mcp-server');
  });

  it('does not report shared-core as added or removed', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.targets.added).not.toContain('shared-core');
    expect(d.targets.removed).not.toContain('shared-core');
  });

  it('counts changes correctly', () => {
    const r = handleDiffCnj('/vfs/diff/a.cnj', '/vfs/diff/b.cnj');
    const d = parseFirstToolObject(r);
    // version changed (1) + goal added (1) + goal removed (1) + decision added (1)
    // + open added (1) + open removed (1) + asset removed (1) + target added (1) = 8
    expect(d.summary.change_count).toBe(8);
    expect(d.summary.has_changes).toBe(true);
  });
});

describe('handleDiffCandidates', () => {
  it('returns error when path_a does not exist', () => {
    const r = handleDiffCandidates('/vfs/diff/missing.cnj', '/vfs/diff/backlog-b.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('reports no changes for identical backlogs', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-same.cnj');
    const d = parseFirstToolObject(r);
    expect(d.summary.has_changes).toBe(false);
    expect(d.summary.change_count).toBe(0);
  });

  it('detects added candidates (in B, not in A)', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    const ids = d.candidates.added.map((c: { readonly id: string }) => c.id);
    expect(ids).toContain('gamma');
    expect(ids).not.toContain('alpha');
    expect(ids).not.toContain('beta');
  });

  it('detects hoisted candidates (in A, f/hoist present in B)', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.candidates.hoisted).toHaveLength(1);
    expect(d.candidates.hoisted[0].id).toBe('alpha');
    expect(d.candidates.hoisted[0].hoist_date).toBe('2026-06-10');
    expect(d.candidates.hoisted[0].into).toBe('decision/alpha-accepted');
  });

  it('does not report hoisted candidates as removed', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    const removedIds = d.candidates.removed.map((c: { readonly id: string }) => c.id);
    expect(removedIds).not.toContain('alpha');
  });

  it('detects status changes (proposed → planned)', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    const betaChange = d.candidates.status_changes.find((c: { readonly id: string }) => c.id === 'beta');
    expect(betaChange).toBeDefined();
    expect(betaChange.before).toBe('proposed');
    expect(betaChange.after).toBe('planned');
  });

  it('detects score changes with before/after per dimension', () => {
    // beta :value changed from 6 to 7
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    const betaScoreDiff = d.candidates.score_changes.find((c: { readonly id: string }) => c.id === 'beta');
    expect(betaScoreDiff).toBeDefined();
    expect(betaScoreDiff.score_changes.value.before).toBe(6);
    expect(betaScoreDiff.score_changes.value.after).toBe(7);
  });

  it('includes graduation count in summary', () => {
    const r = handleDiffCandidates('/vfs/diff/backlog-a.cnj', '/vfs/diff/backlog-b.cnj');
    const d = parseFirstToolObject(r);
    expect(d.summary.graduation_count).toBe(1);
  });
});

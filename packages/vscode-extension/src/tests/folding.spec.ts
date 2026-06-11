import { describe, it, expect } from 'vitest';
import { computeHoistFoldRanges } from '../providers/folding.js';

const MULTI_HOIST = [
  '(f/candidate :foo',        // 0
  '  :status :proposed)',     // 1
  '(f/hoist :of :foo',        // 2 — start of first hoist
  '  :date "2026-06-10"',     // 3
  '  :into :charter-decision/foo', // 4
  '  :note "done")',          // 5 — end (next top-level at 6)
  '(f/hoist :of :bar',        // 6 — start of second hoist
  '  :date "2026-06-10"',     // 7
  '  :into :charter-decision/bar', // 8
  '  :note "also done")',     // 9 — end (EOF)
];

describe('computeHoistFoldRanges', () => {
  it('returns empty for a file with no f/hoist forms', () => {
    expect(computeHoistFoldRanges(['(charter "Proj")', '(target "app")'])).toHaveLength(0);
  });

  it('handles an empty file', () => {
    expect(computeHoistFoldRanges([])).toHaveLength(0);
  });

  it('detects a single f/hoist form spanning to EOF', () => {
    const lines = ['(charter "Proj")', '(f/hoist :of :foo', '  :note "done")'];
    const ranges = computeHoistFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 1, end: 2 });
  });

  it('f/hoist as the only form spans the entire file', () => {
    const lines = ['(f/hoist :of :foo', '  :note "done")'];
    const ranges = computeHoistFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 0, end: 1 });
  });

  it('stops a hoist range when the next top-level form begins', () => {
    const ranges = computeHoistFoldRanges(MULTI_HOIST);
    expect(ranges[0]).toEqual({ start: 2, end: 5 });
  });

  it('detects consecutive f/hoist forms as separate ranges', () => {
    const ranges = computeHoistFoldRanges(MULTI_HOIST);
    expect(ranges).toHaveLength(2);
    expect(ranges[1]).toEqual({ start: 6, end: 9 });
  });

  it('does not fold f/candidate with :status :proposed', () => {
    const lines = ['(f/candidate :foo', '  :status :proposed)'];
    expect(computeHoistFoldRanges(lines)).toHaveLength(0);
  });

  it('does not fold f/candidate even if name starts with hoist-like text', () => {
    const lines = ['(f/hoistish :foo', '  :bar "baz")'];
    expect(computeHoistFoldRanges(lines)).toHaveLength(0);
  });

  it('handles a hoist with no trailing lines (single-line)', () => {
    const ranges = computeHoistFoldRanges(['(f/hoist :of :x :note "y")']);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 0, end: 0 });
  });

  it('folds f/candidate with :status :hoisted', () => {
    const lines = [
      '(f/candidate :foo',
      '  :status :hoisted',
      '  :rationale "done")',
    ];
    const ranges = computeHoistFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 0, end: 2 });
  });

  it('folds hoisted candidates and f/hoist forms together', () => {
    const lines = [
      '(f/candidate :done',   // 0 — hoisted candidate
      '  :status :hoisted)',  // 1
      '(f/candidate :wip',   // 2 — proposed, must not fold
      '  :status :proposed)', // 3
      '(f/hoist :of :done',  // 4 — companion hoist record
      '  :note "shipped")',   // 5
    ];
    const ranges = computeHoistFoldRanges(lines);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ start: 0, end: 1 });
    expect(ranges[1]).toEqual({ start: 4, end: 5 });
  });

  it('does not fold f/candidate with :status :abandoned', () => {
    const lines = ['(f/candidate :old', '  :status :abandoned)'];
    expect(computeHoistFoldRanges(lines)).toHaveLength(0);
  });
});

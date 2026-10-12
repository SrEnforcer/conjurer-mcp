import { describe, it, expect } from 'vitest';
import { computeHoistFoldRanges, computeDecisionFoldRanges } from '../providers/folding.js';

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
});

describe('computeHoistFoldRanges with multiple forms', () => {
  // :foo is named by the first f/hoist, so its candidate folds as well (range 0).
  it('stops a hoist range when the next top-level form begins', () => {
    const ranges = computeHoistFoldRanges(MULTI_HOIST);
    expect(ranges[1]).toEqual({ start: 2, end: 5 });
  });

  it('detects consecutive f/hoist forms as separate ranges', () => {
    const ranges = computeHoistFoldRanges(MULTI_HOIST);
    expect(ranges).toHaveLength(3);
    expect(ranges[0]).toEqual({ start: 0, end: 1 });
    expect(ranges[2]).toEqual({ start: 6, end: 9 });
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
});

describe('computeHoistFoldRanges candidate status handling', () => {
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

describe('computeDecisionFoldRanges', () => {
  it('returns empty for a file with no :decisions block', () => {
    expect(computeDecisionFoldRanges(['(charter "Proj")', '  :status :active)'])).toHaveLength(0);
  });

  it('handles an empty file', () => {
    expect(computeDecisionFoldRanges([])).toHaveLength(0);
  });
});

describe('computeDecisionFoldRanges block shapes', () => {
  it('detects a simple multi-line :decisions block', () => {
    const lines = [
      '(charter "Proj"',              // 0
      '  :decisions [',               // 1 — start
      '    {:date "2026-01-01"',      // 2
      '     :decision "Use EDN"}',    // 3
      '  ]',                          // 4 — end
      '  :status :active)',           // 5
    ];
    const ranges = computeDecisionFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 1, end: 4 });
  });

  it('handles nested vectors inside decision maps', () => {
    const lines = [
      '  :decisions [',               // 0
      '    {:tags [:a :b]',           // 1 — nested vector
      '     :decision "X"}',          // 2
      '  ]',                          // 3
    ];
    const ranges = computeDecisionFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 0, end: 3 });
  });

  it('handles a single-line :decisions block', () => {
    const lines = ['  :decisions [{:decision "tiny"}]'];
    const ranges = computeDecisionFoldRanges(lines);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 0, end: 0 });
  });
});

describe('computeDecisionFoldRanges multi-form handling', () => {
  it('detects :decisions blocks in multiple forms', () => {
    const lines = [
      '(charter "A"',       // 0
      '  :decisions [',     // 1
      '    {:decision "x"}',// 2
      '  ])',               // 3
      '(charter "B"',       // 4
      '  :decisions [',     // 5
      '    {:decision "y"}',// 6
      '  ])',               // 7
    ];
    const ranges = computeDecisionFoldRanges(lines);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ start: 1, end: 3 });
    expect(ranges[1]).toEqual({ start: 5, end: 7 });
  });
});

describe('computeHoistFoldRanges — hoisted by f/hoist', () => {
  it('folds a candidate that an f/hoist names, though its own :status was never edited', () => {
    const lines = [
      '(f/candidate :diff-intent',
      '  :status :proposed',
      '  :rationale "drift detection")',
      '(f/candidate :salvage',
      '  :status :proposed)',
      '(f/hoist :of :diff-intent :date "2026-11-20" :into :decision/x-diff-intent-accepted)',
    ];
    expect(computeHoistFoldRanges(lines)).toEqual([{ start: 0, end: 2 }, { start: 5, end: 5 }]);
  });
});

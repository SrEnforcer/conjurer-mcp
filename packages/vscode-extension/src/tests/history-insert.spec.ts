import { describe, it, expect } from 'vitest';
import { findMatchingClose, historyInsertion } from '../commands/history-insert.js';
import type { TextInsertion } from '../commands/history-insert.js';
import { buildReassessEntry } from '../commands/reassess.js';

const ENTRY = ['(f/reassess :of :alpha', '  :date "2026-10-14"', '  :status :abandoned)'];

const apply = (lines: ReadonlyArray<string>, ins: TextInsertion | undefined): string | undefined => {
  if (ins === undefined) return undefined;
  const before = [...lines.slice(0, ins.line), (lines[ins.line] ?? '').slice(0, ins.character)].join('\n');
  const after = [(lines[ins.line] ?? '').slice(ins.character), ...lines.slice(ins.line + 1)].join('\n');
  return before + ins.text + after;
};

describe('findMatchingClose', () => {
  it('skips brackets inside strings, escaped quotes and comments', () => {
    const lines = ['[(a "x ] \\" ]" ; ]', ' b)]'];
    expect(findMatchingClose(lines, { line: 0, character: 0 })).toEqual({ line: 1, character: 3 });
  });

  it('returns undefined when the bracket never closes', () => {
    expect(findMatchingClose(['[a', 'b'], { line: 0, character: 0 })).toBeUndefined();
  });
});

describe('historyInsertion: new :history', () => {
  it('creates :history on the line after :scores when absent', () => {
    const lines = [
      '(f/candidate :alpha',
      '  :status  :proposed',
      '  :scores  {:feasibility 8 :value 7}',
      '  :rationale "x")',
    ];
    expect(apply(lines, historyInsertion(lines, { startLine: 0, endLine: 3 }, ENTRY))).toBe([
      '(f/candidate :alpha',
      '  :status  :proposed',
      '  :scores  {:feasibility 8 :value 7}',
      '  :history [(f/reassess :of :alpha',
      '              :date "2026-10-14"',
      '              :status :abandoned)]',
      '  :rationale "x")',
    ].join('\n'));
  });

  it('places :history after a :scores map that spans lines', () => {
    const lines = ['(f/candidate :alpha', '  :scores {:feasibility 8', '           :value 7}', '  :rationale "x")'];
    expect(historyInsertion(lines, { startLine: 0, endLine: 3 }, ENTRY)?.line).toBe(3);
  });
});

describe('historyInsertion: existing :history and bounds', () => {
  it('appends as the last entry of an existing :history', () => {
    const lines = [
      '(f/candidate :alpha',
      '  :scores  {:value 7}',
      '  :history [(f/reassess :of :alpha',
      '              :rationale "has ] and ) inside")]',
      '  :rationale "x")',
    ];
    expect(apply(lines, historyInsertion(lines, { startLine: 0, endLine: 4 }, ENTRY))).toBe([
      '(f/candidate :alpha',
      '  :scores  {:value 7}',
      '  :history [(f/reassess :of :alpha',
      '              :rationale "has ] and ) inside")',
      '            (f/reassess :of :alpha',
      '              :date "2026-10-14"',
      '              :status :abandoned)]',
      '  :rationale "x")',
    ].join('\n'));
  });

  it('ignores a :history belonging to the next form', () => {
    const lines = ['(f/candidate :alpha', '  :scores {:value 7}', '  :rationale "x")', '(f/candidate :beta', '  :history [])'];
    expect(historyInsertion(lines, { startLine: 0, endLine: 2 }, ENTRY)?.line).toBe(2);
  });

  it('refuses when the insertion would land outside the form', () => {
    const lines = ['(f/candidate :alpha', '  :scores {:value 7})'];
    expect(historyInsertion(lines, { startLine: 0, endLine: 1 }, ENTRY)).toBeUndefined();
  });
});

describe('buildReassessEntry', () => {
  const before = { feasibility: 8, elegance: 7, containment: 8, value: 7 };

  it('writes only the changed dimensions and no :total', () => {
    const entry = buildReassessEntry({
      id: 'alpha', before, after: { ...before, value: 4 }, rationale: 'say "why"', today: '2026-10-14',
    });
    expect(entry).toEqual([
      '(f/reassess :of :alpha',
      '  :date      "2026-10-14"',
      '  :scores    {:value 4}',
      '  :rationale "say \\"why\\"")',
    ]);
  });

  it('omits :scores when nothing changed', () => {
    const entry = buildReassessEntry({ id: 'alpha', before, after: before, rationale: 'x', today: '2026-10-14' });
    expect(entry.some((l) => l.includes(':scores'))).toBe(false);
  });
});

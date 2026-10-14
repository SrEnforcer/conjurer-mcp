import { describe, it, expect } from 'vitest';
import { charterUpdatedBump } from '../commands/charter-updated.js';

const CHARTER = [
  '(charter "P"',
  '  :version  "0.1.0"',
  '  :updated  "2026-06-09"   ;; note kept',
  '  :goals ["g"])',
  '',
  '(f/candidate :a',
  '  :updated "2020-01-01")',
];

describe('charterUpdatedBump', () => {
  it('replaces only the date of an older :updated, keeping the comment', () => {
    const bump = charterUpdatedBump(CHARTER, '2026-10-14');
    expect(bump).toEqual({ line: 2, character: 13, length: 10, text: '2026-10-14' });
    const line = CHARTER[2] ?? '';
    const edited = line.slice(0, bump?.character) + (bump?.text ?? '') + line.slice((bump?.character ?? 0) + (bump?.length ?? 0));
    expect(edited).toBe('  :updated  "2026-10-14"   ;; note kept');
  });

  it('leaves a current or newer :updated alone', () => {
    expect(charterUpdatedBump(CHARTER, '2026-06-09')).toBeUndefined();
    expect(charterUpdatedBump(CHARTER, '2026-01-01')).toBeUndefined();
  });

  it('ignores :updated outside the charter and files without one', () => {
    expect(charterUpdatedBump(['(charter "P" :goals ["g"])', '(f/x', '  :updated "2020-01-01")'], '2026-10-14'))
      .toBeUndefined();
    expect(charterUpdatedBump(['(f/candidate :a)'], '2026-10-14')).toBeUndefined();
  });
});

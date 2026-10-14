import { describe, it, expect } from 'vitest';
import { checkCharterUpdated } from '../charter-freshness.js';
import { parseDoc } from './validation-fixtures.js';

const charter = (updated: string, decisions = ''): string =>
  `(charter "P" :version "0.1.0" ${updated.length > 0 ? `:updated "${updated}"` : ''} :goals ["g"] :decisions [${decisions}])`;

const d = (date: string): string => `{:date "${date}" :decision "x"}`;

const check = (src: string): ReturnType<typeof checkCharterUpdated> => {
  const doc = parseDoc(src);
  expect(doc).toBeDefined();
  return doc === undefined ? [] : checkCharterUpdated(doc);
};

describe('checkCharterUpdated', () => {
  it('passes when :updated matches the latest decision', () => {
    expect(check(charter('2026-10-14', `${d('2026-06-01')} ${d('2026-10-14')}`))).toEqual([]);
  });

  it('warns when a decision is newer than :updated, naming it', () => {
    const v = check(charter('2026-06-09', `${d('2026-06-01')} ${d('2026-10-12')}`));
    expect(v).toHaveLength(1);
    expect(v[0]?.rule).toBe('charter-updated-stale');
    expect(v[0]?.severity).toBe('warning');
    expect(v[0]?.message).toContain('2026-10-12, charter.decisions[1]');
  });

  it('counts reassessments in :history, standalone f/reassess and f/hoist', () => {
    const base = charter('2026-06-09', d('2026-06-01'));
    const cand = '(f/candidate :a :added "2026-06-01" :status :proposed :scores {:value 5}';
    expect(check(`${base} ${cand} :history [(f/reassess :of :a :date "2026-10-14" :status :abandoned)])`)[0]?.message)
      .toContain('f/reassess :of :a');
    expect(check(`${base} ${cand}) (f/reassess :of :a :date "2026-10-14")`)[0]?.message).toContain('f/reassess :of :a');
    expect(check(`${base} ${cand}) (f/hoist :of :a :date "2026-07-01" :into :decision/x)`)[0]?.message)
      .toContain('f/hoist :of :a');
  });

  it('counts a candidate :added date', () => {
    const v = check(`${charter('2026-06-09')} (f/candidate :b :added "2026-07-01" :status :proposed)`);
    expect(v[0]?.message).toContain('f/candidate :b :added');
  });

  it('stays silent when :updated is absent or malformed', () => {
    expect(check(charter('', d('2026-10-12')))).toEqual([]);
    expect(check(charter('June 2026', d('2026-10-12')))).toEqual([]);
  });
});

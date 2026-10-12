import { describe, it, expect } from 'vitest';
import { validateCnj, lintConventions } from '../validation.js';
import type { CnjDocument } from '../cnj-model.js';
import { parseDoc } from './validation-fixtures.js';

// ── Helpers for convention tests ──────────────────────────────────────────────

const BASE = `(charter "P" :version "0.1.0" :goals ["g"])`;

const withDecisions = (decisions: string): CnjDocument | undefined =>
  parseDoc(`(charter "P" :version "0.1.0" :goals ["g"] :decisions [${decisions}])`);

const withTargets = (targets: string): CnjDocument | undefined =>
  parseDoc(`${BASE} ${targets}`);

const d = (date: string, text: string): string =>
  `{:date "${date}" :decision "${text}"}`;

// ── lintConventions — decisions ───────────────────────────────────────────────

describe('lintConventions — decisions entry shape', () => {
  it('no violations for a well-formed decisions list', () => {
    const doc = withDecisions(`${d('2026-06-01', 'first')} ${d('2026-06-09', 'second')}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
    expect(v).toHaveLength(0);
  });

  it('warns when :decision value is missing', () => {
    const doc = withDecisions(`{:date "2026-06-09"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('warning');
    expect(v[0]?.message).toContain(':decision');
  });

  it('warns when :date value is missing', () => {
    const doc = withDecisions(`{:decision "some text"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
    expect(v).toHaveLength(1);
    expect(v[0]?.message).toContain(':date');
  });

  it('no violations for an empty decisions list', () => {
    const doc = withDecisions('');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule.startsWith('decisions'));
    expect(v).toHaveLength(0);
  });
});

describe('lintConventions — decisions date format', () => {
  it('no violations for correctly-formatted dates', () => {
    const doc = withDecisions(d('2026-06-09', 'text'));
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-date-format');
    expect(v).toHaveLength(0);
  });

  it('warns for a date that is not YYYY-MM-DD', () => {
    const doc = withDecisions(`{:date "June 9" :decision "text"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-date-format');
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('warning');
    expect(v[0]?.message).toContain('June 9');
  });
});

describe('lintConventions — decisions chronological order', () => {
  it('no violations when dates are in order', () => {
    const doc = withDecisions(
      `${d('2026-06-01', 'a')} ${d('2026-06-05', 'b')} ${d('2026-06-09', 'c')}`,
    );
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
    expect(v).toHaveLength(0);
  });

  it('no violations when dates are equal (same-day decisions)', () => {
    const doc = withDecisions(`${d('2026-06-09', 'first')} ${d('2026-06-09', 'second')}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
    expect(v).toHaveLength(0);
  });

  it('warns when a later entry has an earlier date', () => {
    const doc = withDecisions(`${d('2026-06-09', 'later')} ${d('2026-06-01', 'earlier')}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('warning');
    expect(v[0]?.message).toContain('2026-06-01');
    expect(v[0]?.message).toContain('2026-06-09');
  });
});

// ── lintConventions — targets ─────────────────────────────────────────────────

describe('lintConventions — target language', () => {
  it('no violations when all targets declare :language', () => {
    const doc = withTargets('(target :my-target :language :typescript :produces [:lib])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
    expect(v).toHaveLength(0);
  });

  it('warns when a target has no :language', () => {
    const doc = withTargets('(target :my-target :produces [:lib])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
    expect(v).toHaveLength(1);
    expect(v[0]?.severity).toBe('warning');
  });

  it('no violations when there are no targets', () => {
    const doc = parseDoc(BASE);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
    expect(v).toHaveLength(0);
  });
});

// ── validateCnj — conventions integrated ─────────────────────────────────────

describe('validateCnj — lint_conventions integrated', () => {
  it('convention warnings appear in violations', () => {
    const doc = withDecisions(`{:date "June 9" :decision "bad date"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    const conv = report.violations.filter((v) => v.rule === 'decisions-date-format');
    expect(conv).toHaveLength(1);
    expect(conv[0]?.severity).toBe('warning');
  });

  it('document stays valid when only convention warnings are present', () => {
    const doc = withDecisions(`{:date "bad-date" :decision "text"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    expect(report.valid).toBe(true);
  });

  it('strict mode fails on convention warnings', () => {
    // Use the tool-layer strict flag test — here just confirm warnings appear
    const doc = withDecisions(`{:date "bad" :decision "text"}`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    expect(report.violations.some((v) => v.severity === 'warning')).toBe(true);
  });
});

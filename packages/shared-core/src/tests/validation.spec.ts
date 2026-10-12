import { describe, it, expect } from 'vitest';
import { intoMap } from '@tsfpp/prelude';
import { validateCnj, checkSymbolUsage, checkReferences } from '../validation.js';
import type { CnjDocument } from '../cnj-model.js';
import type { SymbolIndex } from '../symbol-index.js';
import { parseDoc, emptyDoc, validDoc } from './validation-fixtures.js';

describe('validateCnj — authored mode', () => {
  it('returns valid for a well-formed doc', () => {
    const report = validateCnj(validDoc, 'authored');
    expect(report.valid).toBe(true);
    expect(report.violations.length).toBe(0);
    expect(report.mode).toBe('authored');
  });

  it('returns charter-title error for empty title', () => {
    const report = validateCnj(emptyDoc, 'authored');
    expect(report.valid).toBe(false);
    const titles = report.violations.filter((v) => v.rule === 'charter-title');
    expect(titles.length).toBe(1);
    expect(titles[0]?.severity).toBe('error');
  });

  it('returns charter-version error for bad version', () => {
    const report = validateCnj(emptyDoc, 'authored');
    const vers = report.violations.filter((v) => v.rule === 'charter-version');
    expect(vers.length).toBe(1);
    expect(vers[0]?.severity).toBe('error');
  });

  it('returns charter-goals warning for zero goals', () => {
    const doc: CnjDocument = {
      ...validDoc,
      charter: { ...validDoc.charter, goals: [] },
    };
    const report = validateCnj(doc, 'authored');
    const goals = report.violations.filter((v) => v.rule === 'charter-goals');
    expect(goals.length).toBe(1);
    expect(goals[0]?.severity).toBe('warning');
  });

  it('doc with goals-warning only is still valid', () => {
    const doc: CnjDocument = {
      ...validDoc,
      charter: { ...validDoc.charter, goals: [] },
    };
    const report = validateCnj(doc, 'authored');
    expect(report.valid).toBe(true);
  });
});

describe('validateCnj — recovered mode', () => {
  it('accepts 0.0.0-recovered as valid version', () => {
    const doc: CnjDocument = {
      ...emptyDoc,
      charter: { ...emptyDoc.charter, title: 'Recovered', version: '0.0.0-recovered', goals: ['g'] },
    };
    const report = validateCnj(doc, 'recovered');
    const vers = report.violations.filter((v) => v.rule === 'charter-version');
    expect(vers.length).toBe(0);
  });
});

describe('validateCnj — from parsed source', () => {
  it('validates a parsed charter correctly', () => {
    const doc = parseDoc('(charter "P" :version "0.1.0" :goals ["do things"])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    expect(report.valid).toBe(true);
  });

  it('flags invalid version from parsed source', () => {
    const doc = parseDoc('(charter "P" :version "bad-version")');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    const vers = report.violations.filter((v) => v.rule === 'charter-version');
    expect(vers.length).toBe(1);
  });
});

describe('validateCnj — intent topology', () => {
  const topologyDoc = (formSrc: string): CnjDocument | undefined =>
    parseDoc(`(charter "P" :version "0.1.0" :goals ["g"]) ${formSrc}`);

  it('does not read :manifest as a capability list (Q-12)', () => {
    const doc = topologyDoc('(conjure do-it :requires [:audit-trail :idempotency] :manifest do-it-result)');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    const top = report.violations.filter((v) => v.rule.startsWith('intent-topology'));
    expect(top.length).toBe(0);
  });

  it('errors when an item is both :requires and :forbids', () => {
    const doc = topologyDoc('(conjure do-it :requires [:silent-retries] :forbids [:silent-retries])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const vs = validateCnj(doc, 'authored').violations.filter((v) => v.rule === 'intent-topology-forbids');
    expect(vs.length).toBe(1);
    expect(vs[0]?.severity).toBe('error');
  });

  it('errors when an item is both :requires and :deferred (authored mode)', () => {
    const doc = topologyDoc('(conjure do-it :requires [feat] :deferred [feat])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const vs = validateCnj(doc, 'authored').violations.filter((v) => v.rule === 'intent-topology-conflict');
    expect(vs.length).toBe(1);
  });

  it('downgrades topology conflicts to warnings in :recovered mode', () => {
    const doc = topologyDoc('(conjure do-it :requires [feat] :deferred [feat])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const vs = validateCnj(doc, 'recovered').violations.filter((v) => v.rule === 'intent-topology-conflict');
    expect(vs.map((v) => v.severity)).toEqual(['warning']);
  });

});

describe('validateCnj — intent topology, softer cases', () => {
  const topologyDoc = (formSrc: string): CnjDocument | undefined =>
    parseDoc(`(charter "P" :version "0.1.0" :goals ["g"]) ${formSrc}`);

  it('warns when an item is both preferred and forbidden', () => {
    const doc = topologyDoc('(conjure do-it :prefers [:analytics] :forbids [:analytics])');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const vs = validateCnj(doc, 'authored').violations.filter((v) => v.rule === 'intent-topology-prefers-forbids');
    expect(vs.length).toBe(1);
    expect(vs[0]?.severity).toBe('warning');
  });

  it('skips forms with no topology fields', () => {
    const doc = topologyDoc('(spell my-spell :purpose "something" :accepts {})');
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const report = validateCnj(doc, 'authored');
    const top = report.violations.filter((v) => v.rule.startsWith('intent-topology'));
    expect(top.length).toBe(0);
  });
});

// Minimal SymbolIndex builder for tests
const makeIndex = (known: ReadonlyArray<string>): SymbolIndex => ({
  symbols: intoMap(known.map((s) => [s, { symbol: s, grimoire: 'core', namespace: '', synopsis: '', keyParams: [] }])),
  grimoires: intoMap([]),
});

describe('checkSymbolUsage — standalone', () => {
  it('returns no violations when all refs are known', () => {
    const index = makeIndex(['charter', 'spell', 'w/prototype']);
    const violations = checkSymbolUsage(['charter', 'spell', 'w/prototype'], index);
    expect(violations).toHaveLength(0);
  });

  it('returns a warning for each unknown symbol', () => {
    const index = makeIndex(['charter']);
    const violations = checkSymbolUsage(['charter', 'unknown-form', 'x/ghost'], index);
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.rule === 'symbol-usage')).toBe(true);
    expect(violations.every((v) => v.severity === 'warning')).toBe(true);
    expect(violations.map((v) => v.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown-form'),
        expect.stringContaining('x/ghost'),
      ]),
    );
  });

  it('returns no violations for an empty ref list', () => {
    const index = makeIndex(['charter']);
    const violations = checkSymbolUsage([], index);
    expect(violations).toHaveLength(0);
  });
});

describe('validateCnj — with symbol index (options)', () => {
  it('skips symbol check when no options provided (backward compat)', () => {
    const report = validateCnj(validDoc, 'authored');
    const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
    expect(sym).toHaveLength(0);
  });

  it('skips symbol check when options.index is undefined', () => {
    const report = validateCnj(validDoc, 'authored', { symbolRefs: ['unknown-symbol'] });
    const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
    expect(sym).toHaveLength(0);
  });

  it('skips symbol check when options.symbolRefs is undefined', () => {
    const index = makeIndex(['charter']);
    const report = validateCnj(validDoc, 'authored', { index });
    const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
    expect(sym).toHaveLength(0);
  });

  it('includes symbol-usage warnings when index and symbolRefs provided', () => {
    const index = makeIndex(['charter']);
    const report = validateCnj(validDoc, 'authored', { index, symbolRefs: ['charter', 'x/ghost'] });
    const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
    expect(sym).toHaveLength(1);
    expect(sym[0]?.message).toContain('x/ghost');
  });

  it('document remains valid when symbol violations are warnings only', () => {
    const index = makeIndex([]);
    const report = validateCnj(validDoc, 'authored', { index, symbolRefs: ['x/ghost'] });
    expect(report.valid).toBe(true);
    const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
    expect(sym).toHaveLength(1);
    expect(sym[0]?.severity).toBe('warning');
  });
});

describe('checkReferences — standalone', () => {
  it('returns no violations when all references exist', () => {
    const status = [
      { ref: 'other.cnj', exists: true },
      { ref: 'sibling.cnj', exists: true },
    ];
    expect(checkReferences(status)).toHaveLength(0);
  });

  it('returns an error for each reference that does not exist', () => {
    const status = [
      { ref: 'found.cnj', exists: true },
      { ref: 'missing.cnj', exists: false },
      { ref: 'also-gone.cnj', exists: false },
    ];
    const violations = checkReferences(status);
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.rule === 'references-resolve')).toBe(true);
    expect(violations.every((v) => v.severity === 'error')).toBe(true);
    expect(violations.map((v) => v.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing.cnj'),
        expect.stringContaining('also-gone.cnj'),
      ]),
    );
  });

  it('returns no violations for an empty status list', () => {
    expect(checkReferences([])).toHaveLength(0);
  });
});

describe('validateCnj — with referencesStatus (options)', () => {
  it('skips references check when no options provided (backward compat)', () => {
    const report = validateCnj(validDoc, 'authored');
    const refs = report.violations.filter((v) => v.rule === 'references-resolve');
    expect(refs).toHaveLength(0);
  });

  it('skips references check when referencesStatus is absent', () => {
    const index = makeIndex(['charter']);
    const report = validateCnj(validDoc, 'authored', { index });
    const refs = report.violations.filter((v) => v.rule === 'references-resolve');
    expect(refs).toHaveLength(0);
  });

  it('runs references check when referencesStatus is provided', () => {
    const referencesStatus = [{ ref: 'missing.cnj', exists: false }];
    const report = validateCnj(validDoc, 'authored', { referencesStatus });
    const refs = report.violations.filter((v) => v.rule === 'references-resolve');
    expect(refs).toHaveLength(1);
    expect(refs[0]?.severity).toBe('error');
    expect(refs[0]?.message).toContain('missing.cnj');
  });

  it('document is invalid when a broken reference produces an error', () => {
    const referencesStatus = [{ ref: 'gone.cnj', exists: false }];
    const report = validateCnj(validDoc, 'authored', { referencesStatus });
    expect(report.valid).toBe(false);
  });

  it('document stays valid when all references exist', () => {
    const referencesStatus = [{ ref: 'present.cnj', exists: true }];
    const report = validateCnj(validDoc, 'authored', { referencesStatus });
    const refs = report.violations.filter((v) => v.rule === 'references-resolve');
    expect(refs).toHaveLength(0);
    expect(report.valid).toBe(true);
  });
});

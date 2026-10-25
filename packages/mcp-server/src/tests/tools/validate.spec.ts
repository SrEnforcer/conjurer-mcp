import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElseOption, intoMap } from '@tsfpp/prelude';
import { handleValidate } from '../../tools/validate.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';
import type { SymbolIndex } from '@conjurer/core';

const VALID = `(charter "Proj" :version "1.0.0" :goals ["goal"])`;
const WARN_ONLY = `(charter "Proj" :version "1.0.0")`;
const ERRORS = `(charter "" :version "0")`;
const WITH_GOOD_REF = `(charter "Proj" :version "1.0.0" :goals ["goal"] :references ["ref-exists.cnj"])`;
const WITH_BAD_REF = `(charter "Proj" :version "1.0.0" :goals ["goal"] :references ["ref-missing.cnj"])`;
const WITH_MIXED_REFS = `(charter "Proj" :version "1.0.0" :goals ["g"] :references ["ref-exists.cnj" "ref-missing.cnj"])`;

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/valid.cnj': VALID,
  '/vfs/warn.cnj': WARN_ONLY,
  '/vfs/errors.cnj': ERRORS,
  '/vfs/with-good-ref.cnj': WITH_GOOD_REF,
  '/vfs/with-bad-ref.cnj': WITH_BAD_REF,
  '/vfs/with-mixed-refs.cnj': WITH_MIXED_REFS,
  '/vfs/ref-exists.cnj': VALID,  // referenced file that exists
  '/vfs/with-broken-ref.cnj': `(charter "Proj" :version "1.0.0" :goals ["g"] :references ["ref-broken.cnj"])`,
  '/vfs/ref-broken.cnj': '(target "lost" :language "ts"',
  '/vfs/with-throwing-ref.cnj': `(charter "Proj" :version "1.0.0" :goals ["g"] :references ["ref-throws.cnj"])`,
  '/vfs/ref-throws.cnj': '',
  '/vfs/with-long-ref.cnj': `(charter "Proj" :version "1.0.0" :goals ["g"] :references ["ref-long.cnj"])`,
  '/vfs/ref-long.cnj': `(charter "Long" :version "1.0.0" :goals ["g"])\n(shape endpoint-contract :notes "${'x'.repeat(200_000)}")`,
};

// Exhausts the stack for real: the RangeError a per-character recursion used to raise.
const overflow = (n: number): number => overflow(n + 1) + 1;

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => {
    // An exception from inside the read, as an unreadable path or a parser fault would give.
    if (path === '/vfs/ref-throws.cnj') return String(overflow(0));
    return getOrElseOption(() => '')(fromNullable(virtualFiles[path]));
  },
}));

const ValidateSchema = z.looseObject({
  valid: z.boolean(),
  violations: z.array(z.looseObject({ rule: z.string(), severity: z.string(), message: z.string() })),
});

const violationsOf = (d: z.output<typeof ValidateSchema>): z.output<typeof ValidateSchema>['violations'] => d.violations;

describe('handleValidate — file access', () => {
  it('returns file-not-found for missing file', () => {
    const r = handleValidate('/vfs/absent.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });

  it('reports valid=true and no violations for clean document', () => {
    const r = handleValidate('/vfs/valid.cnj');
    const d = parseToolJson(r, ValidateSchema);
    expect(d.valid).toBe(true);
    expect(d.violations).toHaveLength(0);
  });

  it('reports valid=true but warnings for warning-only document', () => {
    const r = handleValidate('/vfs/warn.cnj');
    const d = parseToolJson(r, ValidateSchema);
    expect(d.valid).toBe(true);
    expect(d.violations.length).toBeGreaterThan(0);
  });

  it('reports valid=false for error violations', () => {
    const r = handleValidate('/vfs/errors.cnj');
    const d = parseToolJson(r, ValidateSchema);
    expect(d.valid).toBe(false);
    expect(d.violations.length).toBeGreaterThan(0);
  });
});

describe('handleValidate — strict mode', () => {
  it('strict=true fails when warnings are present', () => {
    const r = handleValidate('/vfs/warn.cnj', { mode: 'authored', strict: true });
    const d = parseToolJson(r, ValidateSchema);
    expect(d.valid).toBe(false);
  });

  it('strict=true passes when document is violation-free', () => {
    const r = handleValidate('/vfs/valid.cnj', { mode: 'authored', strict: true });
    const d = parseToolJson(r, ValidateSchema);
    expect(d.valid).toBe(true);
  });
});

const makeIndex = (known: ReadonlyArray<string>): SymbolIndex => ({
  symbols: intoMap(known.map((s) => [s, { symbol: s, grimoire: 'core', namespace: '', synopsis: '', keyParams: [] }])),
  grimoires: intoMap([]),
});

describe('handleValidate — symbol index integration', () => {
  it('produces no symbol-usage violations when no index is passed', () => {
    const r = handleValidate('/vfs/valid.cnj');
    const d = parseToolJson(r, ValidateSchema);
    const symViolations = violationsOf(d).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations).toHaveLength(0);
  });

  it('produces no symbol-usage violations when all refs are known', () => {
    // VALID = (charter "Proj" :version "1.0.0" :goals ["goal"])
    // head-position symbol is 'charter'; pass it as known
    const index = makeIndex(['charter']);
    const r = handleValidate('/vfs/valid.cnj', { index });
    const d = parseToolJson(r, ValidateSchema);
    const symViolations = violationsOf(d).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations).toHaveLength(0);
  });

  it('produces symbol-usage warnings for unknown refs when index is provided', () => {
    // Pass an empty index so 'charter' (head of the form) is unknown
    const emptyIndex = makeIndex([]);
    const r = handleValidate('/vfs/valid.cnj', { index: emptyIndex });
    const d = parseToolJson(r, ValidateSchema);
    const symViolations = violationsOf(d).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations.length).toBeGreaterThan(0);
  });
});


describe('handleValidate — references check integration', () => {
  it('produces no references violations when file has no references', () => {
    const r = handleValidate('/vfs/valid.cnj');
    const d = parseToolJson(r, ValidateSchema);
    const refViolations = violationsOf(d).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(0);
  });

  it('produces no references violations when all referenced files exist', () => {
    const r = handleValidate('/vfs/with-good-ref.cnj');
    const d = parseToolJson(r, ValidateSchema);
    const refViolations = violationsOf(d).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(0);
    expect(d.valid).toBe(true);
  });

  it('produces an error violation for a missing referenced file', () => {
    const r = handleValidate('/vfs/with-bad-ref.cnj');
    const d = parseToolJson(r, ValidateSchema);
    const refViolations = violationsOf(d).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(1);
    expect(refViolations[0]?.severity).toBe('error');
    expect(refViolations[0]?.message).toContain('ref-missing.cnj');
    expect(d.valid).toBe(false);
  });

  it('reports only the missing files when references are mixed', () => {
    const r = handleValidate('/vfs/with-mixed-refs.cnj');
    const d = parseToolJson(r, ValidateSchema);
    const refViolations = violationsOf(d).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(1);
    expect(refViolations[0]?.message).toContain('ref-missing.cnj');
  });
});

describe('handleValidate — referenced files that cannot be read', () => {
  it('reports a referenced file that does not parse as a warning on that reference', () => {
    const d = parseToolJson(handleValidate('/vfs/with-broken-ref.cnj'), ValidateSchema);
    expect(d.valid).toBe(true);
    expect(violationsOf(d).filter((v) => v.rule === 'reference-parses')).toEqual([{
      rule: 'reference-parses',
      severity: 'warning',
      location: 'charter.references',
      message: "Reference 'ref-broken.cnj' could not be read (Parse error at 1:30: Expected rparen); names declared there are not checked",
    }]);
  });

  it('reports an exception while reading a referenced file as a finding, not a failure', () => {
    const d = parseToolJson(handleValidate('/vfs/with-throwing-ref.cnj'), ValidateSchema);
    expect(d.valid).toBe(true);
    expect(violationsOf(d).filter((v) => v.rule === 'reference-parses').map((v) => v.message)).toEqual([
      "Reference 'ref-throws.cnj' could not be read (Unreadable: Maximum call stack size exceeded); names declared there are not checked",
    ]);
  });

  it('fails strict mode on such a finding', () => {
    const d = parseToolJson(handleValidate('/vfs/with-broken-ref.cnj', { strict: true }), ValidateSchema);
    expect(d.valid).toBe(false);
  });

  it('validates a file whose reference holds a 200,000-character string', () => {
    const d = parseToolJson(handleValidate('/vfs/with-long-ref.cnj'), ValidateSchema);
    expect(d.valid).toBe(true);
    expect(violationsOf(d).filter((v) => v.rule === 'reference-parses')).toEqual([]);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElse, intoMap } from '@tsfpp/prelude';
import { handleValidate } from '../../tools/validate.js';
import { parseFirstToolObject } from './tool-json.js';
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
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElse(() => '')(fromNullable(virtualFiles[path])),
}));

describe('handleValidate — file access', () => {
  it('returns file-not-found for missing file', () => {
    const r = handleValidate('/vfs/absent.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });

  it('reports valid=true and no violations for clean document', () => {
    const r = handleValidate('/vfs/valid.cnj');
    const d = parseFirstToolObject(r);
    expect(d.valid).toBe(true);
    expect(d.violations).toHaveLength(0);
  });

  it('reports valid=true but warnings for warning-only document', () => {
    const r = handleValidate('/vfs/warn.cnj');
    const d = parseFirstToolObject(r);
    expect(d.valid).toBe(true);
    expect(d.violations.length).toBeGreaterThan(0);
  });

  it('reports valid=false for error violations', () => {
    const r = handleValidate('/vfs/errors.cnj');
    const d = parseFirstToolObject(r);
    expect(d.valid).toBe(false);
    expect(d.violations.length).toBeGreaterThan(0);
  });
});

describe('handleValidate — strict mode', () => {
  it('strict=true fails when warnings are present', () => {
    const r = handleValidate('/vfs/warn.cnj', 'authored', true);
    const d = parseFirstToolObject(r);
    expect(d.valid).toBe(false);
  });

  it('strict=true passes when document is violation-free', () => {
    const r = handleValidate('/vfs/valid.cnj', 'authored', true);
    const d = parseFirstToolObject(r);
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
    const d = parseFirstToolObject(r);
    const symViolations = (d.violations as ReadonlyArray<{ rule: string }>).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations).toHaveLength(0);
  });

  it('produces no symbol-usage violations when all refs are known', () => {
    // VALID = (charter "Proj" :version "1.0.0" :goals ["goal"])
    // head-position symbol is 'charter'; pass it as known
    const index = makeIndex(['charter']);
    const r = handleValidate('/vfs/valid.cnj', undefined, undefined, index);
    const d = parseFirstToolObject(r);
    const symViolations = (d.violations as ReadonlyArray<{ rule: string }>).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations).toHaveLength(0);
  });

  it('produces symbol-usage warnings for unknown refs when index is provided', () => {
    // Pass an empty index so 'charter' (head of the form) is unknown
    const emptyIndex = makeIndex([]);
    const r = handleValidate('/vfs/valid.cnj', undefined, undefined, emptyIndex);
    const d = parseFirstToolObject(r);
    const symViolations = (d.violations as ReadonlyArray<{ rule: string }>).filter((v) => v.rule === 'symbol-usage');
    expect(symViolations.length).toBeGreaterThan(0);
  });
});

type ViolationLike = { readonly rule: string; readonly severity: string; readonly message: string };

describe('handleValidate — references check integration', () => {
  it('produces no references violations when file has no references', () => {
    const r = handleValidate('/vfs/valid.cnj');
    const d = parseFirstToolObject(r);
    const refViolations = (d.violations as ReadonlyArray<ViolationLike>).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(0);
  });

  it('produces no references violations when all referenced files exist', () => {
    const r = handleValidate('/vfs/with-good-ref.cnj');
    const d = parseFirstToolObject(r);
    const refViolations = (d.violations as ReadonlyArray<ViolationLike>).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(0);
    expect(d.valid).toBe(true);
  });

  it('produces an error violation for a missing referenced file', () => {
    const r = handleValidate('/vfs/with-bad-ref.cnj');
    const d = parseFirstToolObject(r);
    const refViolations = (d.violations as ReadonlyArray<ViolationLike>).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(1);
    expect(refViolations[0]?.severity).toBe('error');
    expect(refViolations[0]?.message).toContain('ref-missing.cnj');
    expect(d.valid).toBe(false);
  });

  it('reports only the missing files when references are mixed', () => {
    const r = handleValidate('/vfs/with-mixed-refs.cnj');
    const d = parseFirstToolObject(r);
    const refViolations = (d.violations as ReadonlyArray<ViolationLike>).filter((v) => v.rule === 'references-resolve');
    expect(refViolations).toHaveLength(1);
    expect(refViolations[0]?.message).toContain('ref-missing.cnj');
  });
});

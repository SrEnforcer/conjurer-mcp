import { describe, it, expect } from 'vitest';
import { intoMap } from '@tsfpp/prelude';
import type { SymbolIndex } from '@conjurer/core';
import { findCharterLine, findSymbolOccurrences, findFormOccurrences, findCandidateOccurrences } from '../providers/codelens.js';

const emptyIdx: SymbolIndex = { symbols: intoMap([]), grimoires: intoMap([]) };

const idx: SymbolIndex = {
  symbols: intoMap([
    ['materialise', { symbol: 'materialise', grimoire: 'core', namespace: 'core', synopsis: 's', keyParams: [] }],
    ['charter', { symbol: 'charter', grimoire: 'core', namespace: 'core', synopsis: 's', keyParams: [] }],
  ]),
  grimoires: intoMap([]),
};

describe('findCharterLine', () => {
  it('returns undefined for empty lines', () => {
    expect(findCharterLine([])).toBeUndefined();
  });

  it('returns undefined when no charter form present', () => {
    expect(findCharterLine(['(target "app")', '(asset "spec")'])).toBeUndefined();
  });

  it('returns 0 for charter on first line', () => {
    expect(findCharterLine(['(charter "My Project" :version "1.0.0")'])).toBe(0);
  });

  it('returns correct line index', () => {
    const lines = [
      '; comment',
      '(charter "My Project" :version "1.0.0")',
      '(target "app")',
    ];
    expect(findCharterLine(lines)).toBe(1);
  });

  it('handles leading whitespace in charter line', () => {
    expect(findCharterLine(['  (charter "X"  :version "1.0.0")'])).toBe(0);
  });
});

describe('findSymbolOccurrences', () => {
  it('returns empty array for no lines', () => {
    expect(findSymbolOccurrences([], idx)).toHaveLength(0);
  });

  it('returns empty array when no known symbols appear', () => {
    const lines = ['(unknown-symbol "foo")', '(another-one)'];
    expect(findSymbolOccurrences(lines, idx)).toHaveLength(0);
  });

  it('returns empty array with empty index', () => {
    const lines = ['(materialise :plan plan)'];
    expect(findSymbolOccurrences(lines, emptyIdx)).toHaveLength(0);
  });

  it('finds a known symbol occurrence', () => {
    const lines = ['(materialise :plan plan)'];
    const occurrences = findSymbolOccurrences(lines, idx);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.symbol).toBe('materialise');
    expect(occurrences[0]?.line).toBe(0);
  });

  it('reports correct line number', () => {
    const lines = ['(target "app")', '(materialise :plan plan)'];
    const occurrences = findSymbolOccurrences(lines, idx);
    expect(occurrences[0]?.line).toBe(1);
  });
});

describe('findFormOccurrences', () => {
  it('returns empty array for no lines', () => {
    expect(findFormOccurrences([])).toHaveLength(0);
  });

  it('finds a charter form with quoted name', () => {
    const lines = ['(charter "My Project" :version "1.0.0")'];
    const forms = findFormOccurrences(lines);
    expect(forms).toHaveLength(1);
    expect(forms[0]?.type).toBe('charter');
    expect(forms[0]?.name).toBe('My Project');
    expect(forms[0]?.line).toBe(0);
  });

  it('finds a target form with quoted name', () => {
    const lines = ['(target "my-app" :language "ts")'];
    const forms = findFormOccurrences(lines);
    expect(forms[0]?.type).toBe('target');
    expect(forms[0]?.name).toBe('my-app');
  });

  it('finds a spell form with unquoted name', () => {
    const lines = ['(spell my-spell :requires ["lib"])'];
    const forms = findFormOccurrences(lines);
    expect(forms[0]?.type).toBe('spell');
    expect(forms[0]?.name).toBe('my-spell');
  });

  it('finds multiple forms at correct line numbers', () => {
    const lines = [
      '(charter "Proj" :version "1.0.0")',
      '  :goals ["g"])',
      '(target "app" :language "ts")',
    ];
    const forms = findFormOccurrences(lines);
    const types = forms.map((f) => f.type);
    expect(types).toContain('charter');
    expect(types).toContain('target');
    const target = forms.find((f) => f.type === 'target');
    expect(target?.line).toBe(2);
  });

  it('does not match indented continuation lines', () => {
    const lines = ['(charter "Proj" :version "1.0.0")', '  :goals ["g"])'];
    const forms = findFormOccurrences(lines);
    expect(forms).toHaveLength(1);
  });

  it('does not match indented parenthesized text within strings', () => {
    const lines = [
      '(asset :tsf-plus-plus',
      '  :description "Line one"',
      '               (the compiler-policy bases), and @tsfpp/prelude',
      '  :language :typescript)',
    ];
    const forms = findFormOccurrences(lines);
    expect(forms).toHaveLength(0);
  });

  it('finds asset forms', () => {
    const lines = ['(asset "My Asset" :enforced-by "CI")'];
    const forms = findFormOccurrences(lines);
    expect(forms[0]?.type).toBe('asset');
    expect(forms[0]?.name).toBe('My Asset');
  });
});

describe('findCandidateOccurrences', () => {
  it('returns empty for no lines', () => {
    expect(findCandidateOccurrences([])).toHaveLength(0);
  });

  it('returns empty when no f/candidate forms present', () => {
    const lines = ['(charter "P" :version "1.0.0")', '(target :foo :language :ts)'];
    expect(findCandidateOccurrences(lines)).toHaveLength(0);
  });

  it('detects a single f/candidate and extracts the id without the colon', () => {
    const lines = ['(f/candidate :my-feature', '  :status :proposed)'];
    const occs = findCandidateOccurrences(lines);
    expect(occs).toHaveLength(1);
    expect(occs[0]?.line).toBe(0);
    expect(occs[0]?.id).toBe('my-feature');
  });

  it('handles hyphens and underscores in the id', () => {
    const lines = ['(f/candidate :codelens-candidate-score'];
    expect(findCandidateOccurrences(lines)[0]?.id).toBe('codelens-candidate-score');
  });

  it('detects multiple candidates at the correct line numbers', () => {
    const lines = [
      '(charter "P" :version "1.0.0")',
      '(f/candidate :alpha',
      '  :status :proposed)',
      '(f/candidate :beta',
      '  :status :planned)',
    ];
    const occs = findCandidateOccurrences(lines);
    expect(occs).toHaveLength(2);
    expect(occs[0]).toEqual({ line: 1, id: 'alpha' });
    expect(occs[1]).toEqual({ line: 3, id: 'beta' });
  });

  it('does not match mentions of f/candidate inside string content', () => {
    const lines = [
      '(f/candidate :alpha',
      '  :rationale "mentions f/candidate :beta in text")',
    ];
    const occs = findCandidateOccurrences(lines);
    expect(occs).toHaveLength(1);
    expect(occs[0]?.id).toBe('alpha');
  });

  it('does not match indented continuation lines', () => {
    const lines = ['  (f/candidate :indented', '  :status :proposed)'];
    expect(findCandidateOccurrences(lines)).toHaveLength(0);
  });
});

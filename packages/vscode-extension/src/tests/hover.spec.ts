import { describe, it, expect } from 'vitest';
import { intoMap } from '@tsfpp/prelude';
import type { SymbolIndex, SymbolRecord } from '@conjurer/core';
import { buildHoverContent } from '../providers/hover.js';

const rec: SymbolRecord = {
  symbol: 'materialise', grimoire: 'core', namespace: 'core',
  synopsis: 'Produce artefacts from a plan', keyParams: ['plan', 'opts'],
  signature: 'materialise plan opts',
};

const recNoSig: SymbolRecord = {
  symbol: 'lookup', grimoire: 'index', namespace: 'index',
  synopsis: 'Find a symbol record', keyParams: [],
};

const idx: SymbolIndex = {
  symbols: intoMap([['materialise', rec], ['lookup', recNoSig]]),
  grimoires: intoMap([]),
};

const emptyIdx: SymbolIndex = { symbols: intoMap([]), grimoires: intoMap([]) };

describe('buildHoverContent', () => {
  it('returns undefined for unknown symbol', () => {
    expect(buildHoverContent(idx, 'unknown')).toBeUndefined();
  });

  it('returns undefined on empty index', () => {
    expect(buildHoverContent(emptyIdx, 'materialise')).toBeUndefined();
  });

  it('includes symbol name and grimoire', () => {
    const result = buildHoverContent(idx, 'materialise');
    expect(result).toBeDefined();
    expect(result).toContain('materialise');
    expect(result).toContain('core');
  });

  it('includes synopsis', () => {
    const result = buildHoverContent(idx, 'materialise');
    expect(result).toContain('Produce artefacts from a plan');
  });

  it('includes signature when present', () => {
    const result = buildHoverContent(idx, 'materialise');
    expect(result).toContain('materialise plan opts');
  });

  it('includes key params when present', () => {
    const result = buildHoverContent(idx, 'materialise');
    expect(result).toContain('plan');
    expect(result).toContain('opts');
  });

  it('omits signature section when not present', () => {
    const result = buildHoverContent(idx, 'lookup');
    expect(result).toBeDefined();
    expect(result).not.toContain('Key params');
  });
});

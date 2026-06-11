import { describe, it, expect } from 'vitest';
import { intoMap } from '@tsfpp/prelude';
import type { SymbolIndex, SpecReader, SymbolRecord, GrimoireRef } from '@conjurer/core';
import { handleLookup, handleSearch, handleList } from '../../tools/retrieval.js';
import type { RetrievalContext } from '../../tools/retrieval.js';
import { parseFirstToolArray, parseFirstToolObject } from './tool-json.js';

const rec1: SymbolRecord = {
  symbol: 'foo/bar', grimoire: 'widgets', namespace: 'foo',
  synopsis: 'renders a bar widget', keyParams: ['data'],
};

const rec2: SymbolRecord = {
  symbol: 'baz/qux', grimoire: 'widgets', namespace: 'baz',
  synopsis: 'queues qux items', keyParams: ['items'],
};

const grim1: GrimoireRef = { name: 'widgets', file: '/spec/widgets.md' };

const mockIndex: SymbolIndex = {
  symbols: intoMap([['foo/bar', rec1], ['baz/qux', rec2]]),
  grimoires: intoMap([['widgets', grim1]]),
};

const mockReader: SpecReader = { specPath: '/tmp/spec' };
const ctx: RetrievalContext = { index: mockIndex, reader: mockReader };
const emptyCtx: RetrievalContext = {
  index: { symbols: intoMap([]), grimoires: intoMap([]) },
  reader: mockReader,
};

describe('handleLookup', () => {
  it('returns symbol record for known symbol', () => {
    const r = handleLookup(ctx, 'foo/bar');
    const d = parseFirstToolObject(r);
    expect(d.symbol).toBe('foo/bar');
    expect(d.synopsis).toBe('renders a bar widget');
  });

  it('returns not-found message for unknown symbol', () => {
    const r = handleLookup(ctx, 'unknown/sym');
    expect(r[0]?.text).toBe('Symbol not found: unknown/sym');
  });

  it('returns not-found on empty index', () => {
    const r = handleLookup(emptyCtx, 'anything');
    expect(r[0]?.text).toMatch(/not found/);
  });
});

describe('handleSearch', () => {
  it('finds symbols matching query', () => {
    const r = handleSearch(ctx, { query: 'bar', grimoire: undefined, limit: undefined });
    const d = parseFirstToolArray(r);
    expect(Array.isArray(d)).toBe(true);
    const syms = d.map((x: Readonly<Record<string, string>>) => x['symbol']);
    expect(syms).toContain('foo/bar');
  });

  it('returns empty array for non-matching query', () => {
    const r = handleSearch(ctx, { query: 'zzznomatch', grimoire: undefined, limit: undefined });
    const d = parseFirstToolArray(r);
    expect(d).toEqual([]);
  });

  it('filters by grimoire', () => {
    const r = handleSearch(ctx, { query: 'qux', grimoire: 'widgets', limit: undefined });
    const d = parseFirstToolArray(r);
    expect(Array.isArray(d)).toBe(true);
  });

  it('respects limit param', () => {
    const r = handleSearch(ctx, { query: 'widget', grimoire: undefined, limit: 1 });
    const d = parseFirstToolArray(r);
    expect(d.length).toBeLessThanOrEqual(1);
  });
});

describe('handleList', () => {
  it('lists all symbols with synopsis', () => {
    const r = handleList(ctx);
    const d = parseFirstToolArray(r);
    expect(Array.isArray(d)).toBe(true);
    expect(d).toHaveLength(2);
  });

  it('returns empty array on empty index', () => {
    const r = handleList(emptyCtx);
    const d = parseFirstToolArray(r);
    expect(d).toEqual([]);
  });

  it('filters by grimoire', () => {
    const r = handleList(ctx, 'widgets');
    const d = parseFirstToolArray(r);
    expect(d).toHaveLength(2);
  });
});

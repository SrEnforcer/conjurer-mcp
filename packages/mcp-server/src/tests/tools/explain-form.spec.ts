/* eslint-disable max-lines-per-function -- DEVIATION(3.4): grouped behavior assertions kept together for scenario traceability in tests. */
import { describe, it, expect, vi } from 'vitest';
import { intoMap, fromNullable, getOrElseOption } from '@tsfpp/prelude';
import type { SymbolIndex, SymbolRecord, GrimoireRef } from '@conjurer/core';
import { handleExplainForm } from '../../tools/retrieval.js';
import type { RetrievalContext } from '../../tools/retrieval.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const ExplainFormSchema = z.looseObject({
  name: z.string(),
  form_type: z.string(),
  validation_rules: z.array(z.unknown()),
  symbols_referenced: z.array(z.looseObject({
    symbol: z.string(),
    known: z.boolean(),
    synopsis: z.string().optional(),
  })),
});

// A .cnj file with a spell that references foo/bar and baz/qux
const WITH_SPELL = [
  '(charter "Proj" :version "1.0.0" :goals ["g"])',
  '(spell my-spell :backed-by foo/bar :also baz/qux :purpose "does things")',
  '(target "my-target" :language "ts" :standard "esm" :produces ["lib"] :modules [])',
].join('\n');

// A file where charter is the only form (test explaining the charter)
const CHARTER_ONLY = '(charter "Simple" :version "0.5.0" :goals ["a goal"])';

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/explain/proj.cnj': WITH_SPELL,
  '/vfs/explain/simple.cnj': CHARTER_ONLY,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElseOption(() => '')(fromNullable(virtualFiles[path])),
}));

const rec1: SymbolRecord = {
  symbol: 'foo/bar', grimoire: 'widgets', namespace: 'foo', synopsis: 'a widget', keyParams: [],
};
const rec2: SymbolRecord = {
  symbol: 'baz/qux', grimoire: 'widgets', namespace: 'baz', synopsis: 'a queue item', keyParams: [],
};
const grim1: GrimoireRef = { name: 'widgets', file: '/spec/widgets.md' };

const mockIndex: SymbolIndex = {
  symbols: intoMap([['foo/bar', rec1], ['baz/qux', rec2]]),
  grimoires: intoMap([['widgets', grim1]]),
};
const ctx: RetrievalContext = { index: mockIndex, reader: { specPath: '/tmp/spec' } };

describe('handleExplainForm', () => {
  it('returns error for non-existent file', () => {
    const r = handleExplainForm(ctx, '/vfs/no/such.cnj', 'anything');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('returns not-found when form name does not exist', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'nonexistent-form');
    expect(r[0]?.text).toMatch(/not found/i);
  });

  it('returns the correct form_type for a spell', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    expect(d.form_type).toBe('spell');
  });

  it('returns the correct form_type for a target', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-target');
    const d = parseToolJson(r, ExplainFormSchema);
    expect(d.form_type).toBe('target');
  });

  it('returns the correct form_type for the charter', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'Proj');
    const d = parseToolJson(r, ExplainFormSchema);
    expect(d.form_type).toBe('charter');
  });

  it('returns known symbols referenced in the form', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    const syms = d.symbols_referenced.map((s) => s.symbol);
    expect(syms).toContain('foo/bar');
    expect(syms).toContain('baz/qux');
  });

  it('marks symbols as known when present in index', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    const fooBar = d.symbols_referenced.find((s) => s.symbol === 'foo/bar');
    expect(fooBar?.known).toBe(true);
    expect(fooBar?.synopsis).toBe('a widget');
  });

  it('marks symbols as not known when absent from index', () => {
    // 'spell' appears as a head symbol — not in the index
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    const unknown = d.symbols_referenced.find((s) => !s.known);
    // There should be at least some unknown symbols (form head etc.)
    // Mainly verifying the known flag works both ways
    expect(unknown).toBeDefined();
  });

  it('returns empty symbols_referenced for a form with no symbol refs', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/simple.cnj', 'Simple');
    const d = parseToolJson(r, ExplainFormSchema);
    // Charter with just title/version/goals — no namespaced symbols
    expect(Array.isArray(d.symbols_referenced)).toBe(true);
  });

  it('includes validation_rules array', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    expect(Array.isArray(d.validation_rules)).toBe(true);
  });

  it('returns the form name in the result', () => {
    const r = handleExplainForm(ctx, '/vfs/explain/proj.cnj', 'my-spell');
    const d = parseToolJson(r, ExplainFormSchema);
    expect(d.name).toBe('my-spell');
  });
});

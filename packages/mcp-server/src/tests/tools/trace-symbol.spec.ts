/* eslint-disable max-lines-per-function -- DEVIATION(3.4): cohesive symbol-trace scenario assertions are intentionally grouped. */
import { describe, it, expect, vi } from 'vitest';
import { intoMap, fromNullable, getOrElseOption } from '@tsfpp/prelude';
import type { SymbolIndex, SpecReader, SymbolRecord, GrimoireRef } from '@conjurer/core';
import { handleTraceSymbol } from '../../tools/retrieval.js';
import type { RetrievalContext } from '../../tools/retrieval.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const TraceSymbolSchema = z.looseObject({
  known_symbol: z.boolean(),
  total_files_scanned: z.number(),
  files_with_reference: z.array(z.looseObject({ file: z.string(), reference_count: z.number() })),
});

// Two top-level forms referencing foo/bar twice (once in charter :backed-by, once in target :from)
const WITH_TWO_REFS = [
  '(charter "T" :version "1.0.0" :goals ["g"] :backed-by foo/bar)',
  '(target "t" :from foo/bar :language "ts" :standard "esm" :produces ["lib"] :modules [])',
].join('\n');

// File that references foo/bar once and baz/qux once
const WITH_MIXED = [
  '(charter "M" :version "1.0.0" :goals ["g"] :backed-by foo/bar)',
  '(target "m" :from baz/qux :language "ts" :standard "esm" :produces ["lib"] :modules [])',
].join('\n');

// Entry file that references both via charter :references
const ENTRY = [
  '(charter "Entry" :version "1.0.0" :goals ["g"] :references ["/vfs/trace/a.cnj" "/vfs/trace/b.cnj"])',
].join('\n');

// A file with no symbol references to any known symbol
const NO_SYM = '(charter "N" :version "1.0.0" :goals ["g"])';

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/trace/entry.cnj': ENTRY,
  '/vfs/trace/a.cnj': WITH_TWO_REFS,
  '/vfs/trace/b.cnj': WITH_MIXED,
  '/vfs/trace/solo.cnj': NO_SYM,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElseOption(() => '')(fromNullable(virtualFiles[path])),
  readdirSync: (): ReadonlyArray<string> => [],
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
const mockReader: SpecReader = { specPath: '/tmp/spec' };
const ctx: RetrievalContext = { index: mockIndex, reader: mockReader };

describe('handleTraceSymbol', () => {
  it('returns workspace error for non-existent entry file', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/no/such/entry.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('known_symbol is true for a symbol in the index', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    expect(d.known_symbol).toBe(true);
  });

  it('known_symbol is false for a symbol absent from the index', () => {
    const r = handleTraceSymbol(ctx, 'unknown/sym', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    expect(d.known_symbol).toBe(false);
  });

  it('reports the correct total_files_scanned', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    // entry + a.cnj + b.cnj (three files discovered)
    expect(d.total_files_scanned).toBe(3);
  });

  it('returns both files that reference foo/bar', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    const files = d.files_with_reference.map((f) => f.file);
    expect(files).toContain('/vfs/trace/a.cnj');
    expect(files).toContain('/vfs/trace/b.cnj');
  });

  it('counts two occurrences in a.cnj', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    const entry = d.files_with_reference.find((f) => f.file === '/vfs/trace/a.cnj');
    expect(entry?.reference_count).toBe(2);
  });

  it('counts one occurrence in b.cnj', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    const entry = d.files_with_reference.find((f) => f.file === '/vfs/trace/b.cnj');
    expect(entry?.reference_count).toBe(1);
  });

  it('returns empty files_with_reference for an unused symbol', () => {
    const r = handleTraceSymbol(ctx, 'foo/bar', '/vfs/trace/solo.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    expect(d.files_with_reference).toHaveLength(0);
  });

  it('correctly traces baz/qux to only b.cnj', () => {
    const r = handleTraceSymbol(ctx, 'baz/qux', '/vfs/trace/entry.cnj');
    const d = parseToolJson(r, TraceSymbolSchema);
    const files = d.files_with_reference.map((f) => f.file);
    expect(files).toContain('/vfs/trace/b.cnj');
    expect(files).not.toContain('/vfs/trace/a.cnj');
  });
});

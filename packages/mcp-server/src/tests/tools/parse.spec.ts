import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElse } from '@tsfpp/prelude';
import { handleParseCnj, handleReadCharter } from '../../tools/parse.js';
import { parseFirstToolObject } from './tool-json.js';

const VALID = `(charter "Proj" :version "1.0.0" :goals ["goal"])`;
const BAD_EDN = `(charter bad edn ::`;

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/ok.cnj': VALID,
  '/vfs/proj.cnj': VALID,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElse(() => '')(fromNullable(virtualFiles[path])),
}));

describe('handleParseCnj — inline', () => {
  it('returns error when no input given', () => {
    const r = handleParseCnj();
    expect(r[0]?.text).toBe('Provide path or content');
  });

  it('parses valid inline content', () => {
    const r = handleParseCnj(undefined, VALID);
    const d = parseFirstToolObject(r);
    expect(d.charter.title).toBe('Proj');
    expect(d.charter.version).toBe('1.0.0');
    expect(d.assets).toEqual([]);
  });

  it('returns parse error for malformed EDN', () => {
    const r = handleParseCnj(undefined, BAD_EDN);
    expect(r[0]?.text).toMatch(/Parse error/);
  });

  it('content preferred over missing path', () => {
    const r = handleParseCnj('/no/such/file.cnj', VALID);
    const d = parseFirstToolObject(r);
    expect(d.charter.title).toBe('Proj');
  });
});

describe('handleParseCnj — file path', () => {
  it('parses from file path', () => {
    const r = handleParseCnj('/vfs/ok.cnj');
    const d = parseFirstToolObject(r);
    expect(d.charter.title).toBe('Proj');
  });

  it('returns error for missing file', () => {
    const r = handleParseCnj('/vfs/missing.cnj');
    expect(r[0]?.text).toBe('Provide path or content');
  });
});

describe('handleReadCharter', () => {
  it('returns full charter when no fields specified', () => {
    const r = handleReadCharter('/vfs/proj.cnj');
    const d = parseFirstToolObject(r);
    expect(d.title).toBe('Proj');
    expect(d.version).toBe('1.0.0');
  });

  it('filters to specified fields', () => {
    const r = handleReadCharter('/vfs/proj.cnj', ['title']);
    const d = parseFirstToolObject(r);
    expect(Object.keys(d)).toEqual(['title']);
    expect(d.title).toBe('Proj');
  });

  it('returns error for non-existent file', () => {
    const r = handleReadCharter('/vfs/nope.cnj');
    expect(r[0]?.text).toMatch(/not found/);
  });
});

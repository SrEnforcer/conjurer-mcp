import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isErr } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { readGrimoire, readSection, describeGrimoireError } from '../spec-reader.js';
import { buildIndex, describeIndexError } from '../symbol-index.js';
import { toCnjModel, describeCnjModelError } from '../cnj-model.js';
import { buildWorkspaceSnapshot, describeWorkspaceError, describeCnjFileError, describeCnjFileReason } from '../workspace-state.js';
import { runMaterialisePreflight, describePreflightError } from '../preflight-resolver.js';

// Each error channel is a kind-tagged union (TSF++ Rule 6.7). These tests pin the tag a
// producer returns and the text its describe function renders, which is what tools report.

const errorOf = <A, E>(r: Result<A, E>): E => {
  if (!isErr(r)) return expect.unreachable('expected an Err');
  return r.error;
};

const dir = mkdtempSync(join(tmpdir(), 'cnj-errors-'));

beforeAll(() => {
  mkdirSync(join(dir, 'empty'));
  mkdirSync(join(dir, 'spec-not-map'));
  mkdirSync(join(dir, 'spec-broken'));
  writeFileSync(join(dir, 'spec-not-map', 'index.edn'), '[1 2]');
  writeFileSync(join(dir, 'spec-broken', 'index.edn'), '{:a "x');
  writeFileSync(join(dir, 'broken.cnj'), '(charter "x"');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('GrimoireError', () => {
  it('tags a missing grimoire and names it', () => {
    const e = errorOf(readGrimoire({ specPath: dir }, 'nope'));
    expect(e).toEqual({ kind: 'grimoire_not_found', grimoire: 'nope' });
    expect(describeGrimoireError(e)).toBe('Grimoire not found: nope');
  });

  it('passes the same error through readSection', () => {
    expect(errorOf(readSection({ specPath: dir }, 'nope', 'x'))).toEqual({ kind: 'grimoire_not_found', grimoire: 'nope' });
  });
});

describe('IndexError', () => {
  it('tags a missing index.edn with its path', () => {
    const e = errorOf(buildIndex({ specPath: join(dir, 'empty') }));
    expect(e).toEqual({ kind: 'index_not_found', path: join(dir, 'empty', 'index.edn') });
    expect(describeIndexError(e)).toBe(`index.edn not found at ${join(dir, 'empty', 'index.edn')}`);
  });

  it('keeps the parse error as the cause', () => {
    const e = errorOf(buildIndex({ specPath: join(dir, 'spec-broken') }));
    expect(e.kind).toBe('index_unparseable');
    expect(describeIndexError(e)).toBe('Unterminated string');
  });

  it('tags a root that is not a map', () => {
    const e = errorOf(buildIndex({ specPath: join(dir, 'spec-not-map') }));
    expect(e).toEqual({ kind: 'index_not_a_map' });
    expect(describeIndexError(e)).toBe('index.edn root must be a map');
  });
});

describe('CnjModelError', () => {
  it('tags an empty document with its source file', () => {
    const e = errorOf(toCnjModel([], 'x.cnj'));
    expect(e).toEqual({ kind: 'empty_document', sourceFile: 'x.cnj' });
    expect(describeCnjModelError(e)).toBe('Empty .cnj file');
  });
});

describe('CnjFileError', () => {
  it('renders each variant with the file it concerns', () => {
    const cause = { kind: 'ParseError', message: 'Unterminated string', line: 1, column: 2 } as const;
    expect(describeCnjFileError({ kind: 'file_not_found', path: 'a.cnj' })).toBe('File not found: a.cnj');
    expect(describeCnjFileError({ kind: 'file_unparseable', path: 'a.cnj', cause }))
      .toBe('Parse error in a.cnj: Unterminated string');
    expect(describeCnjFileError({ kind: 'file_unmodelable', path: 'a.cnj', cause: { kind: 'empty_document', sourceFile: 'a.cnj' } }))
      .toBe('Model error in a.cnj: Empty .cnj file');
  });
});

describe('describeCnjFileReason', () => {
  it('renders each variant without the path, a parse error with its location', () => {
    const cause = { kind: 'ParseError', message: 'Expected rparen', line: 3, column: 12 } as const;
    expect(describeCnjFileReason({ kind: 'file_not_found', path: 'a.cnj' })).toBe('File not found');
    expect(describeCnjFileReason({ kind: 'file_unparseable', path: 'a.cnj', cause })).toBe('Parse error at 3:12: Expected rparen');
    expect(describeCnjFileReason({ kind: 'file_unmodelable', path: 'a.cnj', cause: { kind: 'empty_document', sourceFile: 'a.cnj' } }))
      .toBe('Model error: Empty .cnj file');
  });
});

describe('WorkspaceError', () => {
  it('tags a missing entry file', () => {
    const e = errorOf(buildWorkspaceSnapshot(join(dir, 'nope.cnj')));
    expect(e).toEqual({ kind: 'entry_not_found', path: join(dir, 'nope.cnj') });
    expect(describeWorkspaceError(e)).toBe(`Entry file not found: ${join(dir, 'nope.cnj')}`);
  });

  it('tags an entry file that does not parse', () => {
    const e = errorOf(buildWorkspaceSnapshot(join(dir, 'broken.cnj')));
    const path = join(dir, 'broken.cnj');
    const cause = { kind: 'ParseError', message: 'Expected rparen', line: 1, column: 13 };
    expect(e).toEqual({ kind: 'entry_unparseable', path, cause: { kind: 'file_unparseable', path, cause } });
    expect(describeWorkspaceError(e)).toBe(`Could not parse entry file: ${path} (Parse error at 1:13: Expected rparen)`);
  });
});

describe('PreflightError', () => {
  it('tags a folder without .cnj files', () => {
    const e = errorOf(runMaterialisePreflight(join(dir, 'empty')));
    expect(e).toEqual({ kind: 'no_cnj_files', folder: join(dir, 'empty') });
    expect(describePreflightError(e)).toBe(`No .cnj files found in ${join(dir, 'empty')}`);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElseOption, intoMap } from '@tsfpp/prelude';
import { parse, parsePrelude } from '@conjurer/core';
import type { SymbolIndex } from '@conjurer/core';
import { handleCheckPostconditions } from '../../tools/postconditions.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const PostconditionsSchema = z.looseObject({
  ensure_forms: z.number(),
  holds: z.boolean(),
  prelude_available: z.boolean(),
  summary: z.record(z.string(), z.number()),
  results: z.array(z.looseObject({
    mcp_claimed: z.boolean(),
    outcomes: z.array(z.looseObject({ status: z.string() })),
  })),
});

const RATE_LIMITER = `(charter "Infra" :version "1.0.0" :goals ["g"])
(conjure rate-limiter-config
  :tier :standard
  :within (ensure
            :structural [(<= requests-per-minute 300)
                         (>= burst-allowance 30)
                         (in? algorithm #{:token-bucket :sliding-window})
                         (every-field-documented?)]
            :verify-via [:mcp]
            :on-violation :halt))`;

const virtualFiles: Readonly<Record<string, string>> = { '/vfs/infra.cnj': RATE_LIMITER };

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElseOption(() => '')(fromNullable(virtualFiles[path])),
}));

const preludeNode = parse(`{:types [string integer one-of] :predicates [= not= < <= > >= in? and or not] :expansion [for str]}`);
const index: SymbolIndex = {
  symbols: intoMap([]),
  grimoires: intoMap([]),
  prelude: parsePrelude(preludeNode._tag === 'Ok' ? preludeNode.value[0] : undefined),
};

describe('handleCheckPostconditions', () => {
  it('evaluates prelude predicates and reports semantic ones without evaluating them', () => {
    const r = handleCheckPostconditions(
      { kind: 'file', path: '/vfs/infra.cnj', form: 'rate-limiter-config' },
      { 'requests-per-minute': 500, 'burst-allowance': 40, algorithm: ':token-bucket' },
      index,
    );
    const d = parseToolJson(r, PostconditionsSchema);
    expect(d.ensure_forms).toBe(1);
    expect(d.holds).toBe(false);
    expect(d.results[0]?.outcomes.map((o) => o.status)).toEqual(['fail', 'pass', 'pass', 'semantic']);
    expect(d.results[0]?.mcp_claimed).toBe(true);
  });

  it('checks inline EDN', () => {
    const r = handleCheckPostconditions({ kind: 'edn', text: '(ensure :structural [(<= p99 (ms 200))] :verify-via [:mcp])' }, { p99: { unit: 'ms', magnitude: 180 } }, index);
    const d = parseToolJson(r, PostconditionsSchema);
    expect(d.holds).toBe(true);
    expect(d.summary).toEqual({ pass: 1 });
  });

  it('treats every predicate as semantic when the spec has no prelude', () => {
    const r = handleCheckPostconditions({ kind: 'edn', text: '(ensure :structural [(<= x 1)])' }, { x: 0 }, { symbols: intoMap([]), grimoires: intoMap([]) });
    const d = parseToolJson(r, PostconditionsSchema);
    expect(d.prelude_available).toBe(false);
    expect(d.results[0]?.outcomes[0]?.status).toBe('semantic');
  });

  it('reports a missing file', () => {
    const r = handleCheckPostconditions({ kind: 'file', path: '/vfs/missing.cnj' }, {}, index);
    expect(r[0]?.text).toContain('File not found');
  });
});

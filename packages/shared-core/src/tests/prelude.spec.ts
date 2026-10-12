import { describe, it, expect } from 'vitest';
import { isOk, intoMap } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import type { EdnNode } from '../edn-parser.js';
import { parsePrelude, semanticHeads, isPreludeExpr } from '../prelude.js';
import type { Prelude } from '../prelude.js';
import { checkPredicate, findEnsureSites, fromJson, unverifiableAtMcp } from '../postconditions.js';
import type { JsonValue } from '../postconditions.js';
import { lintRetiredForms } from '../migration-lint.js';
import { collectSymbolRefs } from '../symbol-index.js';

const NIL: EdnNode = { type: 'nil', line: 0, column: 0 };
const forms = (src: string): ReadonlyArray<EdnNode> => {
  const r = parse(src);
  return isOk(r) ? r.value : [];
};
const one = (src: string): EdnNode => forms(src)[0] ?? NIL;

// The :prelude map as index.edn 2.0.0 lists it.
const PRELUDE: Prelude = parsePrelude(one(`{:types [string integer decimal boolean keyword date datetime uuid url list one-of]
  :predicates [= not= < <= > >= in? and or not]
  :expansion [for str entities-of fields-of relations-of]}`));

const values = (json: { readonly [key: string]: JsonValue }): ReadonlyMap<string, ReturnType<typeof fromJson>> =>
  intoMap(Object.entries(json).map(([k, v]) => [k, fromJson(v)] as const));

describe('EDN parser — vectors and sets', () => {
  it('marks vectors and parses sets', () => {
    const node = one('(in? algorithm #{:token-bucket :sliding-window})');
    expect(node.type === 'list' ? node.elements[2] : undefined).toMatchObject({ type: 'list', delimiter: 'set' });
    expect(one('[a b]')).toMatchObject({ type: 'list', delimiter: 'vector' });
  });

  it('explains why | is rejected', () => {
    const r = parse('{(keyword) (integer | percent)}');
    expect(isOk(r)).toBe(false);
    expect(isOk(r) ? '' : r.error.message).toContain('(one-of ...)');
  });
});

describe('prelude classification', () => {
  it('accepts predicates, unit forms, type forms and keyword access', () => {
    expect(isPreludeExpr(one('(<= requests-per-minute 300)'), PRELUDE)).toBe(true);
    expect(isPreludeExpr(one('(<= total-locked-time (seconds 5))'), PRELUDE)).toBe(true);
    expect(isPreludeExpr(one('(integer :min 1 :max 9)'), PRELUDE)).toBe(true);
    expect(isPreludeExpr(one('(= (:status order) :shipped)'), PRELUDE)).toBe(true);
  });

  it('names the semantic functions in an expression', () => {
    expect(semanticHeads(one('(every-field-has-label?)'), PRELUDE)).toEqual(['every-field-has-label?']);
    expect(semanticHeads(one('(and (> age 18) (verified-identity? applicant))'), PRELUDE)).toEqual(['verified-identity?']);
  });
});

describe('checkPredicate', () => {
  const env = values({ 'requests-per-minute': 250, 'burst-allowance': 20, algorithm: ':token-bucket', 'total-locked-time': { unit: 'seconds', magnitude: 7 } });

  it('passes and fails deterministically against supplied values', () => {
    expect(checkPredicate(one('(<= requests-per-minute 300)'), env, PRELUDE).status).toBe('pass');
    expect(checkPredicate(one('(>= burst-allowance 30)'), env, PRELUDE).status).toBe('fail');
    expect(checkPredicate(one('(in? algorithm #{:token-bucket :sliding-window})'), env, PRELUDE).status).toBe('pass');
    expect(checkPredicate(one('(<= total-locked-time (seconds 5))'), env, PRELUDE).status).toBe('fail');
  });

  it('refuses to evaluate a semantic function and reports a missing value', () => {
    expect(checkPredicate(one('(every-step-has :rollback)'), env, PRELUDE).status).toBe('semantic');
    expect(checkPredicate(one('(< p99-latency (ms 200))'), env, PRELUDE).status).toBe('unbound');
  });

  it('reports a unit mismatch rather than comparing across units', () => {
    expect(checkPredicate(one('(<= total-locked-time (minutes 5))'), env, PRELUDE).status).toBe('error');
  });
});

describe('ensure sites and the :mcp claim', () => {
  const src = `(conjure rate-limiter-config
    :within (ensure :structural [(<= requests-per-minute 300) (every-field-has-label?)]
                    :verify-via [:mcp]))
  (conjure signup-form :within (ensure :structural [(csrf-token-included?)] :verify-via [:llm]))`;

  it('finds nested ensure forms with their owner', () => {
    const sites = findEnsureSites(forms(src));
    expect(sites.map((s) => [s.owner, s.verifyVia, s.structural.length])).toEqual([
      ['conjure:rate-limiter-config', ['mcp'], 2],
      ['conjure:signup-form', ['llm'], 1],
    ]);
  });

  it('flags only semantic predicates that claim :mcp', () => {
    const flagged = unverifiableAtMcp(findEnsureSites(forms(src)), PRELUDE);
    expect(flagged.map((f) => f.predicate)).toEqual(['(every-field-has-label?)']);
  });
});

describe('retired forms', () => {
  it('flags each retired form with its replacement', () => {
    const src = `(branch routing :on score :cases {(< score 0.3) (conjure approve) :else (conjure review)})
      (ward widget :protect (conjure fetch) :recover {timeout? (conjure cached)} :escalate :when (> failures 50))
      (refine overview :deepen :by 3)
      (x/recover-model src :confidence :grade-each)
      (a/define reviewer :style {:confidence :calibrated})
      (context establish payments :domain :financial-services)
      (f/hoist :of :x :into :charter-decision/x-accepted)`;
    expect(lintRetiredForms(forms(src)).map((v) => v.rule)).toEqual([
      'deprecated-map-cases', 'deprecated-map-recover', 'deprecated-escalate-when', 'deprecated-deepen-by',
      'deprecated-confidence-grade-each', 'deprecated-style-confidence', 'deprecated-context-establish',
      'deprecated-reference-prefix',
    ]);
  });

  it('is silent on current forms', () => {
    const src = `(branch routing :on score :cases [(< score 0.3) (conjure approve) :else (conjure review)])
      (refine overview :deepen 3 :because "rights need depth")`;
    expect(lintRetiredForms(forms(src))).toEqual([]);
  });
});

describe('collectSymbolRefs', () => {
  it('does not treat vector heads or unit forms as symbol references', () => {
    const refs = collectSymbolRefs(forms('(conjure plan :horizon (months 6) :checks [entity coll])'));
    expect(refs).toEqual(['conjure']);
  });
});

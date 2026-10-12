import { describe, it, expect } from 'vitest';
import { isOk, isErr, intoMap } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import type { EdnNode } from '../edn-parser.js';
import { parsePrelude, classifyExpression } from '../prelude.js';
import type { Prelude } from '../prelude.js';
import { evaluateExpression, printValue } from '../prelude-eval.js';
import { checkPreludeUsage } from '../prelude-checks.js';

// The :prelude entry as index.edn 2.0.0 declares it.
const INDEX = `{:version "2.0.0"
 :prelude {:literals   [:string :number :ratio :keyword :boolean :nil :vector :map :set]
           :units      :open-family
           :types      [string integer decimal boolean keyword date datetime uuid url list one-of]
           :predicates [= not= < <= > >= in? and or not]
           :access     :keyword-lookup
           :expansion  [for str entities-of fields-of relations-of]}}`;

const NIL_NODE: EdnNode = { type: 'nil', line: 0, column: 0 };
const EMPTY: Prelude = { types: [], predicates: [], expansion: [], keywordAccess: false, openUnits: false };

const forms = (src: string): ReadonlyArray<EdnNode> => {
  const r = parse(src);
  return isOk(r) ? r.value : [];
};

const one = (src: string): EdnNode => forms(src)[0] ?? NIL_NODE;

const loadPrelude = (): Prelude => {
  const root = one(INDEX);
  return (root.type === 'map' ? parsePrelude(root) : undefined) ?? EMPTY;
};

const PRELUDE = loadPrelude();

const bindings = (src: string): ReadonlyMap<string, EdnNode> => {
  const m = one(src);
  return m.type === 'map' ? m.entries : intoMap([]);
};

const run = (expr: string, env = '{}'): string => {
  const r = evaluateExpression(one(expr), PRELUDE, bindings(env));
  return isOk(r) ? printValue(r.value) : `error:${r.error.kind}`;
};

describe('edn-parser — prelude literals', () => {
  it('parses a set as a list with delim set', () => {
    const n = one('#{:a :b}');
    expect(n.type === 'list' && n.delim).toBe('set');
  });

  it('marks parentheses and brackets', () => {
    const n = one('(f [1 2])');
    expect(n.type === 'list' && n.delim).toBe('paren');
    expect(n.type === 'list' && n.elements[1]?.type === 'list' && n.elements[1].delim).toBe('bracket');
  });

  it('parses a ratio as its quotient', () => {
    const n = one('1/5');
    expect(n.type === 'number' && n.value).toBe(0.2);
  });

  it('still parses a map after a set', () => {
    expect(forms('#{1} {:a 1}')).toHaveLength(2);
  });
});

describe('parsePrelude', () => {
  it('reads every family', () => {
    expect(PRELUDE.predicates).toContain('in?');
    expect(PRELUDE.types).toContain('one-of');
    expect(PRELUDE.expansion).toContain('entities-of');
    expect(PRELUDE.keywordAccess).toBe(true);
    expect(PRELUDE.openUnits).toBe(true);
  });

  it('returns undefined when index.edn has no :prelude', () => {
    const root = one('{:version "1.4.0"}');
    expect(root.type === 'map' && parsePrelude(root)).toBeUndefined();
  });
});

describe('classifyExpression', () => {
  it('accepts a predicate over a unit form', () => {
    const c = classifyExpression(one('(<= daily-limit (eur 10000))'), PRELUDE);
    expect(c.deterministic).toBe(true);
    expect(c.freeVariables).toEqual(['daily-limit']);
  });

  it('reports a semantic head with its position', () => {
    const c = classifyExpression(one('(and (every-field-has-label?) (> n 1))'), PRELUDE);
    expect(c.deterministic).toBe(false);
    expect(c.semanticHeads.map((h) => h.head)).toEqual(['every-field-has-label?']);
  });

  it('treats a domain type with modifiers as semantic', () => {
    expect(classifyExpression(one('(icd-10-code :valid :current)'), PRELUDE).deterministic).toBe(false);
  });

  it('does not walk type modifiers', () => {
    const c = classifyExpression(one('(list :of medication-record)'), PRELUDE);
    expect(c.deterministic).toBe(true);
    expect(c.freeVariables).toEqual([]);
  });

  it('treats names bound by for as bound, and allowed heads as deterministic', () => {
    const c = classifyExpression(
      one('(for [entity (entities-of model)] (compliant-endpoint entity :handles [:create]))'),
      PRELUDE,
      { allowedHeads: ['compliant-endpoint'] },
    );
    expect(c.deterministic).toBe(true);
    expect(c.freeVariables).toEqual(['model']);
  });
});

describe('evaluateExpression', () => {
  it('compares units of the same kind', () => {
    expect(run('(<= daily-limit (eur 10000))', '{daily-limit (eur 5000)}')).toBe('true');
    expect(run('(> daily-limit (eur 10000))', '{daily-limit (eur 5000)}')).toBe('false');
  });

  it('refuses to compare different units', () => {
    expect(run('(< (eur 1) (usd 1))')).toBe('error:type-error');
  });

  it('evaluates in? over a set', () => {
    expect(run('(in? algorithm #{:token-bucket :sliding-window})', '{algorithm :token-bucket}')).toBe('true');
    expect(run('(in? algorithm #{:token-bucket})', '{algorithm :fixed}')).toBe('false');
  });

  it('short-circuits and/or', () => {
    expect(run('(or true (unknown-fn))')).toBe('true');
    expect(run('(and false (unknown-fn))')).toBe('false');
    expect(run('(and true (unknown-fn))')).toBe('error:semantic');
  });

  it('evaluates =, not= and not', () => {
    expect(run('(= [1 :a] [1 :a])')).toBe('true');
    expect(run('(not= #{1 2} #{2 1})')).toBe('false');
    expect(run('(not (= 1 2))')).toBe('true');
  });

  it('looks up a keyword in a map', () => {
    expect(run('(:worst-anomaly profile)', '{profile {:worst-anomaly 3}}')).toBe('3');
    expect(run('(:absent profile)', '{profile {:a 1}}')).toBe('nil');
  });

  it('concatenates with str', () => {
    expect(run('(str name "-endpoint")', '{name "policy"}')).toBe('"policy-endpoint"');
  });

  it('reports unbound variables, semantic heads and unevaluated forms', () => {
    expect(run('(< x 1)')).toBe('error:unbound');
    expect(run('(score-transaction t)', '{t 1}')).toBe('error:semantic');
    expect(run('(integer :min 1)')).toBe('error:not-evaluated');
    expect(run('(entities-of m)', '{m {}}')).toBe('error:not-evaluated');
  });

  it('reports a type error for a non-boolean in and', () => {
    const r = evaluateExpression(one('(and 1 true)'), PRELUDE, intoMap([]));
    expect(isErr(r) && r.error.kind).toBe('type-error');
  });
});

describe('checkPreludeUsage', () => {
  it('flags a semantic head in :expands-to but allows params and spells', () => {
    const vs = checkPreludeUsage(forms(`
      (spell compliant-endpoint [entity] :doc "x" (conjure entity))
      (incantation crud-suite [model]
        :expands-to (for [e (entities-of model)] (compliant-endpoint e (guess e))))`), PRELUDE);
    expect(vs.map((v) => v.rule)).toEqual(['incantation-expands-to-prelude']);
    expect(vs[0]?.message).toMatch(/'guess'/);
    expect(vs[0]?.severity).toBe('warning');
  });

  it('flags a structural ensure predicate outside the prelude', () => {
    const vs = checkPreludeUsage(forms(`
      (conjure api :within (ensure :structural [(<= rpm 300) (every-field-has-label?)]))`), PRELUDE);
    expect(vs).toHaveLength(1);
    expect(vs[0]?.rule).toBe('ensure-structural-prelude');
  });

  it('is silent for prelude-only documents', () => {
    expect(checkPreludeUsage(forms('(ensure :structural [(in? x #{:a})] :semantic [(anything)])'), PRELUDE)).toEqual([]);
  });
});

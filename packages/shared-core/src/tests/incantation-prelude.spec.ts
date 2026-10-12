import { describe, it, expect } from 'vitest';
import { isOk } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import type { EdnNode } from '../edn-parser.js';
import { checkIncantationPrelude } from '../validation.js';
import type { Prelude } from '../prelude.js';

const PRELUDE: Prelude = {
  predicates: ['=', 'not=', '<', '<=', '>', '>=', 'in?', 'and', 'or', 'not'],
  types: ['string', 'integer', 'list', 'one-of'],
  expansion: ['for', 'str', 'entities-of', 'fields-of', 'relations-of'],
};

// A source that does not parse yields a sentinel form, so a test cannot pass vacuously.
const UNPARSED: ReadonlyArray<EdnNode> = [{ type: 'string', value: 'unparsed', line: 0, column: 0 }];

const forms = (src: string): ReadonlyArray<EdnNode> => {
  const r = parse(src);
  return isOk(r) ? r.value : UNPARSED;
};

const SPELL = '(spell compliant-endpoint [entity & {:keys [audience]}] :doc "x" (conjure entity))';

describe('checkIncantationPrelude', () => {
  it('parses the canonical spell signature with & and :keys', () => {
    expect(forms(SPELL)).not.toBe(UNPARSED);
  });

  it('accepts prelude forms, parameters and spells registered in the file', () => {
    const vs = checkIncantationPrelude(forms(`${SPELL}
      (incantation crud-suite [model]
        :expands-to (for [entity (entities-of model)]
                      (compliant-endpoint entity :handles [:create :read])))`), PRELUDE);
    expect(vs).toEqual([]);
  });

  it('warns for a head outside the prelude, the parameters and the spells', () => {
    const vs = checkIncantationPrelude(forms(`${SPELL}
      (incantation crud-suite [model]
        :expands-to (for [e (entities-of model)] (compliant-endpoint (guess-name e))))`), PRELUDE);
    expect(vs).toHaveLength(1);
    expect(vs[0]?.rule).toBe('incantation-expands-to-prelude');
    expect(vs[0]?.severity).toBe('warning');
    expect(vs[0]?.location).toBe('incantation:crud-suite');
    expect(vs[0]?.message).toMatch(/guess-name/);
  });

  it('warns for a spell not registered in this file', () => {
    const vs = checkIncantationPrelude(forms(`
      (incantation suite [model] :expands-to (for [e (entities-of model)] (other-spell e)))`), PRELUDE);
    expect(vs.map((v) => v.message)).toEqual([expect.stringMatching(/other-spell/)]);
  });

  it('ignores an incantation without :expands-to', () => {
    expect(checkIncantationPrelude(forms('(incantation x [m] :doc "nothing yet")'), PRELUDE)).toEqual([]);
  });
});

describe('parse — ratios', () => {
  it('parses a ratio as its quotient and a negative ratio too', () => {
    const r = parse('1/5 -3/4');
    const values = isOk(r) ? r.value.map((n) => (n.type === 'number' ? n.value : NaN)) : [];
    expect(values).toEqual([0.2, -0.75]);
  });

  it('keeps / as a symbol constituent elsewhere', () => {
    const r = parse('w/prototype');
    expect(isOk(r) && r.value[0]?.type === 'symbol').toBe(true);
  });
});

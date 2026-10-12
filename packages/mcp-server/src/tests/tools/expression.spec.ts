import { describe, it, expect } from 'vitest';
import { handleCheckExpression } from '../../tools/expression.js';
import { parseFirstToolObject } from './tool-json.js';
import type { Prelude } from '@conjurer/core';

const PRELUDE: Prelude = {
  types: ['string', 'integer', 'list', 'one-of'],
  predicates: ['=', 'not=', '<', '<=', '>', '>=', 'in?', 'and', 'or', 'not'],
  expansion: ['for', 'str', 'entities-of', 'fields-of', 'relations-of'],
  keywordAccess: true,
  openUnits: true,
};

describe('handleCheckExpression', () => {
  it('evaluates a prelude predicate against bindings', () => {
    const d = parseFirstToolObject(handleCheckExpression(
      { expression: '(<= daily-limit (eur 10000))', bindings: '{daily-limit (eur 5000)}' }, PRELUDE,
    ));
    expect(d.deterministic).toBe(true);
    expect(d.free_variables).toEqual(['daily-limit']);
    expect(d.evaluation).toEqual({ status: 'value', value: 'true' });
  });

  it('reports a semantic head without guessing', () => {
    const d = parseFirstToolObject(handleCheckExpression({ expression: '(every-field-has-label?)' }, PRELUDE));
    expect(d.deterministic).toBe(false);
    expect(d.semantic_heads[0].head).toBe('every-field-has-label?');
    expect(d.evaluation.status).toBe('semantic');
  });

  it('reports an unbound variable', () => {
    const d = parseFirstToolObject(handleCheckExpression({ expression: '(< x 1)' }, PRELUDE));
    expect(d.deterministic).toBe(true);
    expect(d.evaluation.status).toBe('unbound');
  });

  it('honours allowed heads', () => {
    const d = parseFirstToolObject(handleCheckExpression(
      { expression: '(for [e (entities-of m)] (endpoint e))', allowedHeads: ['endpoint'] }, PRELUDE,
    ));
    expect(d.deterministic).toBe(true);
    expect(d.evaluation.status).toBe('not-evaluated');
  });

  it('rejects more than one form and non-map bindings', () => {
    expect(parseFirstToolObject(handleCheckExpression({ expression: '1 2' }, PRELUDE)).error).toMatch(/exactly one form/);
    expect(parseFirstToolObject(handleCheckExpression({ expression: 'x', bindings: '[1]' }, PRELUDE)).error).toMatch(/EDN map/);
  });

  it('says so when the spec has no prelude', () => {
    const d = parseFirstToolObject(handleCheckExpression({ expression: '(= 1 1)' }, undefined));
    expect(d.prelude_available).toBe(false);
  });
});

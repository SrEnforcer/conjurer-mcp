import { describe, it, expect } from 'vitest';
import { isOk, isSome } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import { toCnjModel } from '../cnj-model.js';
import { parseReference, bareName, bindingNames, declaredNames } from '../references.js';
import { checkFormReferences } from '../validation.js';
import type { CnjDocument } from '../cnj-model.js';

const parseDoc = (src: string): CnjDocument | undefined => {
  const r = parse(src);
  if (!isOk(r)) return undefined;
  const m = toCnjModel(r.value, 'test.cnj');
  return isOk(m) ? m.value : undefined;
};

const charterWithDecisions = `(charter "Platform" :version "1.0.0" :goals ["g"]
  :decisions [{:id :amendment-approval :date "2025-11-04" :decision "Finance approves amendments."}
              {:id :small-amendments :date "2026-03-02" :supersedes :amendment-approval
               :decision "Amendments under 500 EUR need no approval."}])`;

describe('parseReference and bareName', () => {
  it('parses a reference keyword by kind', () => {
    const ref = parseReference(':decision/amendment-approval');
    expect(isSome(ref) ? ref.value : undefined).toEqual({ kind: 'decision', name: 'amendment-approval' });
  });

  it('reads the legacy :charter-decision/ prefix as a decision', () => {
    const ref = parseReference('charter-decision/x-diff-intent-accepted');
    expect(isSome(ref) ? ref.value.kind : undefined).toBe('decision');
  });

  it('does not treat a namespaced construct of another grimoire as a reference', () => {
    expect(isSome(parseReference('d/model'))).toBe(false);
  });

  it('reduces keyword, symbol and reference spellings to one name', () => {
    expect([bareName(':api'), bareName('api'), bareName(':target/api')]).toEqual(['api', 'api', 'api']);
  });
});

describe('declared and bound names', () => {
  it('collects decision ids, targets, spells and bindings', () => {
    const doc = parseDoc(`${charterWithDecisions}
      (spell compliant-endpoint [entity] :doc "x" (conjure entity))
      (def billing-domain (d/explore "requirements.pdf"))
      (target :api :language :typescript :from billing-domain)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const declared = declaredNames(doc);
    expect(declared.get('decision')).toEqual(['amendment-approval', 'small-amendments']);
    expect(declared.get('spell')).toEqual(['compliant-endpoint']);
    expect(declared.get('target')).toEqual(['api']);
    expect(bindingNames(doc)).toEqual(['billing-domain', 'api']);
  });
});

describe('checkFormReferences', () => {
  it('accepts a :supersedes and an f/hoist :into that resolve', () => {
    const doc = parseDoc(`${charterWithDecisions}
      (f/candidate :diff-intent :label "x" :status :proposed :rationale "a reason long enough")
      (f/hoist :of :diff-intent :date "2026-11-20" :into :decision/small-amendments)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    expect(checkFormReferences(doc)).toEqual([]);
  });

  it('warns when a reference names nothing declared in the file', () => {
    const doc = parseDoc(`${charterWithDecisions}
      (f/hoist :of :diff-intent :date "2026-11-20" :into :decision/never-recorded)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    const vs = checkFormReferences(doc);
    expect(vs.map((v) => [v.rule, v.severity])).toEqual([['reference-resolves', 'warning']]);
  });

  it('warns when :into is a plain keyword rather than a reference keyword', () => {
    const doc = parseDoc(`${charterWithDecisions}
      (f/hoist :of :diff-intent :date "2026-11-20" :into :x-diff-intent-accepted)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    expect(checkFormReferences(doc).map((v) => v.rule)).toEqual(['reference-kind']);
  });

  it('does not check :core/ references against the document', () => {
    const doc = parseDoc(`${charterWithDecisions}
      (f/hoist :of :spell :date "2026-07-01" :into :core/spell)`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    expect(checkFormReferences(doc)).toEqual([]);
  });

  it('errors on a duplicate decision id', () => {
    const doc = parseDoc(`(charter "P" :version "1.0.0" :goals ["g"]
      :decisions [{:id :a :date "2026-01-01" :decision "one"} {:id :a :date "2026-01-02" :decision "two"}])`);
    expect(doc).toBeDefined();
    if (doc === undefined) return;
    expect(checkFormReferences(doc).map((v) => [v.rule, v.severity])).toEqual([['decision-id-unique', 'error']]);
  });
});

import { describe, it, expect } from 'vitest';
import { isOk, isErr, err, fromNullable, isSome } from '@tsfpp/prelude';
import type { CnjCandidateForm } from '../cnj-model.js';
import type { Result } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import { toCnjModel } from '../cnj-model.js';
import type { CnjDocument } from '../cnj-model.js';

const parseAndModel = (src: string): Result<CnjDocument, string> => {
  const r = parse(src);
  if (!isOk(r)) return err(r.error.message);
  return toCnjModel(r.value, 'test.cnj');
};

describe('toCnjModel — errors', () => {
  it('returns err for empty input', () => {
    const r = toCnjModel([], 'empty.cnj');
    expect(isErr(r)).toBe(true);
  });

  it('returns err for empty string parse', () => {
    const r = parseAndModel('');
    expect(isErr(r)).toBe(true);
  });
});

describe('toCnjModel — charter', () => {
  it('parses a minimal charter', () => {
    const r = parseAndModel('(charter "My Project" :version "1.0.0")');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.charter.title).toBe('My Project');
    expect(r.value.charter.version).toBe('1.0.0');
  });

  it('parses charter goals list', () => {
    const r = parseAndModel('(charter "P" :version "1.0.0" :goals ["goal one" "goal two"])');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.charter.goals.length).toBe(2);
    expect(r.value.charter.goals[0]).toBe('goal one');
  });

  it('parses nested decisions', () => {
    const src = '(charter "P" :version "1.0.0" :decisions [{:choice "Use EDN" :evidence ["fast"]}])';
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.charter.decisions.length).toBe(1);
    const d = fromNullable(r.value.charter.decisions[0]);
    expect(isSome(d)).toBe(true);
  });

  it('uses default charter when none present', () => {
    const r = parseAndModel(':some-keyword');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.charter.title).toBe('');
    expect(r.value.charter.version).toBe('');
  });
});

describe('toCnjModel — targets', () => {
  it('parses a target form', () => {
    const src = '(target shared-core :language "TypeScript" :standard "tsf++")';
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.targets.length).toBe(1);
    expect(r.value.targets[0]?.name).toBe('shared-core');
    expect(r.value.targets[0]?.language).toBe('TypeScript');
  });

  it('parses a target with :from dependency', () => {
    const src = '(target mcp-server :language "TypeScript" :from shared-core)';
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const t = fromNullable(r.value.targets[0]);
    if (!isSome(t)) return;
    expect(t.value.from).toBe('shared-core');
  });

  it('parses a target with modules list', () => {
    const src = '(target shared-core :modules [{:name "types.ts"} {:name "parser.ts"}])';
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const t = fromNullable(r.value.targets[0]);
    if (!isSome(t)) return;
    expect(t.value.modules.length).toBe(2);
  });

  it('records sourceFile on the document', () => {
    const nodes = parse(':x');
    if (!isOk(nodes)) return;
    const doc = toCnjModel(nodes.value, 'my-file.cnj');
    expect(isOk(doc)).toBe(true);
    if (!isOk(doc)) return;
    expect(doc.value.sourceFile).toBe('my-file.cnj');
  });
});

describe('toCnjModel — assets', () => {
  it('parses an asset form', () => {
    const src = '(asset tsf-standard :type "constraint" :applies-to [shared-core mcp-server])';
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.assets.length).toBe(1);
    expect(r.value.assets[0]?.name).toBe('tsf-standard');
    expect(r.value.assets[0]?.appliesTo.length).toBe(2);
  });
});

describe('toCnjModel — combined', () => {
  it('parses a complete multi-form document', () => {
    const src = [
      '(charter "Proj" :version "0.1.0" :goals ["g1"])',
      '(asset lint :type "constraint" :applies-to [core])',
      '(target core :language "TypeScript")',
    ].join('\n');
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.charter.title).toBe('Proj');
    expect(r.value.assets.length).toBe(1);
    expect(r.value.targets.length).toBe(1);
  });
});

const CANDIDATE_SRC = `
(f/candidate :my-feature
  :label "My feature"
  :cluster :cluster-a
  :added "2026-06-10"
  :status :proposed
  :scores {:feasibility 7 :elegance 9 :containment 8 :value 8}
  :rationale "Worth keeping because X. Deferred until Y."
  :conditions ["Y must be done first"])`;

const firstCandidate = (src: string): CnjCandidateForm | undefined => {
  const r = parseAndModel(src);
  return isOk(r) ? r.value.candidates[0] : undefined;
};

describe('toCnjModel — f/candidate fields', () => {
  it('parses a f/candidate form', () => {
    const r = parseAndModel(CANDIDATE_SRC);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.candidates.length).toBe(1);
  });

  it('extracts id from the second element', () => {
    const c = firstCandidate(CANDIDATE_SRC);
    expect(c?.id).toBe('my-feature');
  });

  it('extracts string fields', () => {
    const c = firstCandidate(CANDIDATE_SRC);
    expect(c?.label).toBe('My feature');
    expect(c?.cluster).toBe('cluster-a');
    expect(c?.status).toBe('proposed');
    expect(c?.added).toBe('2026-06-10');
    expect(c?.rationale).toBe('Worth keeping because X. Deferred until Y.');
  });

  it('extracts scores as a map of numbers', () => {
    const c = firstCandidate(CANDIDATE_SRC);
    expect(c?.scores.get('feasibility')).toBe(7);
    expect(c?.scores.get('elegance')).toBe(9);
    expect(c?.scores.get('containment')).toBe(8);
    expect(c?.scores.get('value')).toBe(8);
  });

  it('extracts conditions list', () => {
    const c = firstCandidate(CANDIDATE_SRC);
    expect(c?.conditions.length).toBe(1);
    expect(c?.conditions[0]).toBe('Y must be done first');
  });

});

describe('toCnjModel — f/candidate collection', () => {
  it('accumulates multiple candidates', () => {
    const src = `
(f/candidate :one :label "One" :cluster :x :added "2026-01-01" :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5} :rationale "r1")
(f/candidate :two :label "Two" :cluster :x :added "2026-01-02" :status :proposed
  :scores {:feasibility 7 :elegance 8 :containment 7 :value 9} :rationale "r2")`;
    const r = parseAndModel(src);
    if (!isOk(r)) return;
    expect(r.value.candidates.length).toBe(2);
  });

  it('does not add f/candidate to domainForms', () => {
    const r = parseAndModel(CANDIDATE_SRC);
    if (!isOk(r)) return;
    expect(r.value.domainForms.length).toBe(0);
  });

  it('defaults candidates to empty array when none present', () => {
    const r = parseAndModel('(charter "P" :version "1.0.0")');
    if (!isOk(r)) return;
    expect(r.value.candidates).toEqual([]);
  });

  it('defaults hoists to empty array when none present', () => {
    const r = parseAndModel('(charter "P" :version "1.0.0")');
    if (!isOk(r)) return;
    expect(r.value.hoists).toEqual([]);
  });
});

describe('toCnjModel — f/candidate :history (CnjReassessment)', () => {
  it('defaults history to empty array when :history absent', () => {
    const src = `(charter "P" :version "1.0.0")
(f/candidate :x :label "X" :cluster :c :added "2026-01-01" :status :proposed
  :scores {:feasibility 7} :rationale "r")`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.candidates[0]?.history).toEqual([]);
  });

  it('parses a single f/reassess entry from :history', () => {
    const src = `(charter "P" :version "1.0.0")
(f/candidate :x :label "X" :cluster :c :added "2026-01-01" :status :proposed
  :scores {:feasibility 6 :elegance 8} :rationale "r"
  :history [
    (f/reassess :of :x
      :date "2026-08-14"
      :scores {:feasibility 9}
      :rationale "Parser landed; feasibility rose."
      :status :planned)])`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const history = r.value.candidates[0]?.history ?? [];
    expect(history).toMatchObject([
      { of: 'x', date: '2026-08-14', rationale: expect.stringMatching(/Parser landed/), status: 'planned' },
    ]);
    expect(history[0]?.scores.get('feasibility')).toBe(9);
  });

});

describe('toCnjModel — f/candidate :history ordering', () => {
  it('parses multiple reassessments preserving insertion order', () => {
    const src = `(charter "P" :version "1.0.0")
(f/candidate :y :label "Y" :cluster :c :added "2026-01-01" :status :proposed
  :scores {:feasibility 6} :rationale "r"
  :history [
    (f/reassess :of :y :date "2026-08-01" :scores {:feasibility 8} :rationale "first" :status :proposed)
    (f/reassess :of :y :date "2026-09-01" :scores {:feasibility 9} :rationale "second" :status :planned)])`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const history = r.value.candidates[0]?.history;
    expect(history?.length).toBe(2);
    expect(history?.[0]?.date).toBe('2026-08-01');
    expect(history?.[1]?.date).toBe('2026-09-01');
    expect(history?.[1]?.scores.get('feasibility')).toBe(9);
  });

  it('only picks up f/reassess nodes; ignores other items in :history', () => {
    const src = `(charter "P" :version "1.0.0")
(f/candidate :z :label "Z" :cluster :c :added "2026-01-01" :status :proposed
  :scores {:feasibility 5} :rationale "r"
  :history [
    :stray-keyword
    (f/reassess :of :z :date "2026-08-01" :scores {:feasibility 7} :rationale "ok" :status :proposed)])`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.candidates[0]?.history.length).toBe(1);
  });
});

describe('toCnjModel — f/hoist (CnjHoist)', () => {
  it('parses a top-level f/hoist form', () => {
    const src = `(charter "P" :version "1.0.0")
(f/hoist :of :list_candidates
  :date "2026-06-10"
  :into :charter-decision/list-candidates-2026-06-10
  :outcomes [:cnj-model-gains-candidates :new-foresight-module]
  :note "Both conditions met.")`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.hoists.length).toBe(1);
    const h = r.value.hoists[0];
    expect(h?.of).toBe('list_candidates');
    expect(h?.date).toBe('2026-06-10');
    expect(h?.into).toBe('charter-decision/list-candidates-2026-06-10');
    expect(h?.outcomes).toContain('cnj-model-gains-candidates');
    expect(h?.outcomes).toContain('new-foresight-module');
    expect(h?.note).toMatch(/Both conditions/);
  });

  it('parses multiple f/hoist forms in document order', () => {
    const src = `(charter "P" :version "1.0.0")
(f/hoist :of :alpha :date "2026-06-01" :into :decision/alpha :outcomes [:impl] :note "first")
(f/hoist :of :beta  :date "2026-06-10" :into :decision/beta  :outcomes [:impl] :note "second")`;
    const r = parseAndModel(src);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.hoists.length).toBe(2);
    expect(r.value.hoists[0]?.of).toBe('alpha');
    expect(r.value.hoists[1]?.of).toBe('beta');
  });
});

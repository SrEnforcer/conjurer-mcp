import { describe, it, expect } from 'vitest';
import { parse, toCnjModel, describeCnjModelError } from '@conjurer/core';
import type { CnjDocument } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';
import { buildDecidePrompt } from '../commands/decide-prompt.js';

const SOURCE = `(charter "Demo" :version "1.0.0"
  :goals ["Serve the spec to the IDE"])

(f/candidate :alpha
  :label "Alpha idea"
  :cluster :ux
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 6 :elegance 6 :containment 6 :value 6}
  :rationale "Might help."
  :history [(f/reassess :of :alpha :date "2026-08-01" :scores {:value 8} :rationale "Asked for twice.")])

(f/candidate :beta
  :label "Beta idea"
  :cluster :ux
  :added "2026-06-02"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Also might help.")

(f/candidate :gamma
  :label "Gamma idea"
  :added "2026-06-03"
  :status :abandoned
  :scores {:feasibility 1 :elegance 1 :containment 1 :value 1}
  :rationale "Dropped.")
`;

const model = (): CnjDocument => {
  const parsed = parse(SOURCE);
  if (isErr(parsed)) return expect.unreachable(`parse error: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, 'demo.cnj');
  if (isErr(doc)) return expect.unreachable(`model error: ${describeCnjModelError(doc.error)}`);
  return doc.value;
};

const promptFor = (id: string): string => {
  const doc = model();
  const candidate = doc.candidates.find((c) => c.id === id);
  if (candidate === undefined) return expect.unreachable(`no candidate ${id}`);
  return buildDecidePrompt({
    candidate,
    candidates: doc.candidates,
    charterContent: '(charter "Demo")',
    filePath: 'demo.cnj',
    formContent: '(f/candidate :alpha ...)',
    goals: doc.charter.goals,
    today: '2026-10-14',
  });
};

describe('buildDecidePrompt', () => {
  it('states the current score from the latest reassessment, and when that was', () => {
    expect(promptFor('alpha')).toContain(
      'Status: proposed · score 26 (feasibility 6, elegance 6, containment 6, value 8) · added 2026-06-01 · last reassessed 2026-08-01 · today 2026-10-14',
    );
  });

  it('says never when the candidate has not been reassessed', () => {
    expect(promptFor('beta')).toContain('last reassessed never');
  });

  it('lists the other active candidates for comparison, marking the same cluster, and leaves out the subject and inactive ones', () => {
    const prompt = promptFor('alpha');
    expect(prompt).toContain('  beta: Beta idea (score 20, proposed) (same cluster)');
    expect(prompt).not.toContain('  alpha: Alpha idea');
    expect(prompt).not.toContain('gamma');
  });

  it('includes the goals', () => {
    expect(promptFor('alpha')).toContain('1. Serve the spec to the IDE');
  });

  it('asks the practitioner before deciding, and allows no undecided outcome', () => {
    const prompt = promptFor('alpha');
    expect(prompt).toContain('Then stop and wait for my answers.');
    expect(prompt).toContain('"Needs more thought" is not an option');
    expect(prompt).toMatch(/\*\*plan\*\*.*\*\*keep\*\*.*\*\*abandon\*\*/s);
  });

  it('records the verdict as a dated f/reassess after the candidate, never as an edit', () => {
    const prompt = promptFor('alpha');
    expect(prompt).toContain('(f/reassess :of :alpha\n  :date      "2026-10-14"');
    expect(prompt).toContain('directly after the closing paren of `(f/candidate :alpha`');
    expect(prompt).toContain("Never edit the candidate's own :status or :scores");
  });
});

describe('buildDecidePrompt record template', () => {
  it('suggests no particular verdict or score in its template', () => {
    const prompt = promptFor('beta');
    expect(prompt).toContain('  :scores    {:<dimension> <1-10>}');
    expect(prompt).toContain('  :status    :<planned|abandoned>) ;; omit for keep');
  });
});

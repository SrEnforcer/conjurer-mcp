import { describe, it, expect } from 'vitest';
import { intoMap } from '@tsfpp/prelude';
import type { CnjCandidateForm } from '@conjurer/core';
import { extractFormContent, buildRefinePrompt, buildResolveOpenPrompt, buildRefreshGoalsPrompt } from '../commands/refine.js';

const LINES = [
  '(charter "My Project" :version "1.0.0" :goals ["build something"]',
  '  :decisions [{:date "2026-01-01" :decision "use EDN"}]',
  '  :open ["should we add HTTP?"])',
  '(target "app" :language "ts" :standard "esm"',
  '  :produces ["lib"]',
  '  :modules [])',
  '(spell my-spell :requires ["lib"] :manifest ["lib"])',
];

describe('extractFormContent', () => {
  it('returns single line for a one-line form', () => {
    const lines = ['(asset "Spec" :version "1.0.0")', '(target "app")'];
    expect(extractFormContent(lines, 0)).toBe('(asset "Spec" :version "1.0.0")');
  });

  it('collects multi-line form until next top-level form', () => {
    const content = extractFormContent(LINES, 0);
    expect(content).toContain('(charter "My Project"');
    expect(content).toContain(':open ["should we add HTTP?"]');
    // Must NOT include the target form
    expect(content).not.toContain('(target "app"');
  });

  it('collects the target form independently', () => {
    const content = extractFormContent(LINES, 3);
    expect(content).toContain('(target "app"');
    expect(content).toContain(':modules []');
    expect(content).not.toContain('(spell my-spell');
  });

  it('handles a form that is the last form in the file', () => {
    const content = extractFormContent(LINES, 6);
    expect(content).toContain('(spell my-spell');
  });

  it('handles startLine beyond array length gracefully', () => {
    expect(extractFormContent(LINES, 999)).toBe('');
  });

  it('caps at MAX lines', () => {
    const longLines = Array.from({ length: 200 }, (_, i) => `  :key-${i} "value"`);
    const formLines = ['(charter "X" :version "1.0.0"', ...longLines];
    const content = extractFormContent(formLines, 0);
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(81); // 80 + 1 for the form head
  });
});

describe('buildRefinePrompt', () => {
  it('includes the form type and name in the prompt', () => {
    const p = buildRefinePrompt({ filePath: '/proj/design.cnj', formContent: '(target "my-app")', formName: 'my-app', formType: 'target' });
    expect(p).toContain('Form type: target');
    expect(p).toContain('Form name: my-app');
  });

  it('includes the file path', () => {
    const p = buildRefinePrompt({ filePath: '/proj/mcp.cnj', formContent: '(spell my-spell)', formName: 'my-spell', formType: 'spell' });
    expect(p).toContain('/proj/mcp.cnj');
  });

  it('includes the form content verbatim', () => {
    const content = '(target "app" :produces ["lib"])';
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: content, formName: 'app', formType: 'target' });
    expect(p).toContain(content);
  });

  it('includes target-specific guidance for target forms', () => {
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: '(target "app")', formName: 'app', formType: 'target' });
    expect(p).toContain(':modules');
    expect(p).toContain(':produces');
  });

  it('includes spell-specific guidance for spell forms', () => {
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: '(spell my-spell)', formName: 'my-spell', formType: 'spell' });
    expect(p).toContain(':requires');
    expect(p).toContain(':manifest');
  });
});

describe('buildRefinePrompt charter and fallback guidance', () => {
  it('includes charter-specific guidance for charter forms', () => {
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: '(charter "My Project")', formName: 'My Project', formType: 'charter' });
    expect(p).toContain(':goals');
    expect(p).toContain(':decisions');
  });

  it('includes the refine key parameters in the prompt', () => {
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: '(asset "Spec")', formName: 'Spec', formType: 'asset' });
    expect(p).toContain(':focus-on');
    expect(p).toContain(':add');
    expect(p).toContain(':adjust');
    expect(p).toContain(':without');
  });

  it('uses default guidance for unknown form types', () => {
    const p = buildRefinePrompt({ filePath: '/f.cnj', formContent: '(ritual my-ritual)', formName: 'my-ritual', formType: 'ritual' });
    // Should still produce a valid prompt, not throw
    expect(p).toContain('Form type: ritual');
    expect(p.length).toBeGreaterThan(100);
  });
});

describe('buildResolveOpenPrompt', () => {
  const questions = ['Should we support HTTP?', 'Which test framework to use?'];
  const charterContent = '(charter "Proj" :version "1.0.0" :goals ["g"] :open [...])';

  it('lists all open questions numbered', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/f.cnj');
    expect(p).toContain('1. Should we support HTTP?');
    expect(p).toContain('2. Which test framework to use?');
  });

  it('includes the question count in the header', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/f.cnj');
    expect(p).toContain('Open questions to resolve (2)');
  });

  it('includes the charter content for context', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/f.cnj');
    expect(p).toContain(charterContent);
  });

  it('includes the file path', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/my/design.cnj');
    expect(p).toContain('/my/design.cnj');
  });

  it('names the Conjurer constructs used', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/f.cnj');
    expect(p).toContain('r/hypothesise');
    expect(p).toContain('r/argue');
    expect(p).toContain('r/check');
  });

  it('asks for a :decisions EDN entry in the output', () => {
    const p = buildResolveOpenPrompt(questions, charterContent, '/f.cnj');
    expect(p).toContain(':decisions');
    expect(p).toContain(':date');
  });

  it('handles a single open question', () => {
    const p = buildResolveOpenPrompt(['Only question'], charterContent, '/f.cnj');
    expect(p).toContain('Open questions to resolve (1)');
    expect(p).toContain('1. Only question');
  });
});

// ── buildRefreshGoalsPrompt ───────────────────────────────────────────────

const makeCandidate = ({
  id,
  cluster,
  status,
  scores,
  rationale,
  history = [],
}: {
  readonly cluster: string;
  readonly history?: CnjCandidateForm['history'];
  readonly id: string;
  readonly rationale: string;
  readonly scores: Record<string, number>;
  readonly status: string;
}): CnjCandidateForm => ({
  id,
  label: id,
  cluster,
  status,
  scores: intoMap(Object.entries(scores)),
  rationale,
  conditions: [],
  added: '2026-01-01',
  history,
});

const goals = ['deliver a working MCP server', 'keep the spec read-only'];
const charterCtx = '(charter "proj" :version "1.0")';

describe('buildRefreshGoalsPrompt', () => {
  it('includes the current goals numbered', () => {
    const p = buildRefreshGoalsPrompt({ goals, candidates: [], charterContent: charterCtx, filePath: '/f.cnj' });
    expect(p).toContain('1. deliver a working MCP server');
    expect(p).toContain('2. keep the spec read-only');
  });

  it('includes the file path', () => {
    const p = buildRefreshGoalsPrompt({ goals, candidates: [], charterContent: charterCtx, filePath: '/design/proj.cnj' });
    expect(p).toContain('File: /design/proj.cnj');
  });

  it('lists active candidates with cluster and score', () => {
    const cands = [
      makeCandidate({ id: 'alpha', cluster: 'cluster-d', status: 'proposed', scores: { feasibility: 9, elegance: 8, containment: 9, value: 7 }, rationale: 'Fast symbol search.' }),
      makeCandidate({ id: 'beta', cluster: 'cluster-f', status: 'planned', scores: { feasibility: 7, elegance: 7, containment: 8, value: 8 }, rationale: 'Backlog health.' }),
    ];
    const p = buildRefreshGoalsPrompt({ goals, candidates: cands, charterContent: charterCtx, filePath: '/f.cnj' });
    expect(p).toContain('[cluster-d] alpha');
    expect(p).toContain('[cluster-f] beta');
    expect(p).toContain('score 33');
    expect(p).toContain('score 30');
  });
});

describe('buildRefreshGoalsPrompt candidate filtering', () => {
  it('uses effective scores when history is present', () => {
    const cand = makeCandidate({
      id: 'reassessed',
      cluster: 'cluster-d',
      status: 'proposed',
      scores: { feasibility: 5, elegance: 9, containment: 9, value: 9 },
      rationale: 'Was 36; feasibility down to 5.',
      history: [{ of: 'reassessed', date: '2026-06-10', scores: intoMap([['feasibility', 5]]), rationale: 'Harder than expected.', status: 'proposed' }],
    });
    const p = buildRefreshGoalsPrompt({ goals, candidates: [cand], charterContent: charterCtx, filePath: '/f.cnj' });
    // effective total: 5+9+9+9 = 32 (reassessment overrides feasibility only)
    expect(p).toContain('score 32');
  });

  it('excludes hoisted and abandoned candidates', () => {
    const cands = [
      makeCandidate({ id: 'live', cluster: 'cluster-d', status: 'proposed', scores: { feasibility: 8, elegance: 8, containment: 8, value: 8 }, rationale: 'Active.' }),
      makeCandidate({ id: 'gone', cluster: 'cluster-d', status: 'hoisted', scores: { feasibility: 9, elegance: 9, containment: 9, value: 9 }, rationale: 'Done.' }),
      makeCandidate({ id: 'dropped', cluster: 'cluster-d', status: 'abandoned', scores: { feasibility: 1, elegance: 1, containment: 1, value: 1 }, rationale: 'Nope.' }),
    ];
    const p = buildRefreshGoalsPrompt({ goals, candidates: cands, charterContent: charterCtx, filePath: '/f.cnj' });
    expect(p).toContain('[cluster-d] live');
    expect(p).not.toContain('gone');
    expect(p).not.toContain('dropped');
  });

  it('shows (none) when no active candidates', () => {
    const p = buildRefreshGoalsPrompt({ goals, candidates: [], charterContent: charterCtx, filePath: '/f.cnj' });
    expect(p).toContain('(none)');
  });
});

describe('buildRefreshGoalsPrompt ranking', () => {
  it('ranks candidates by descending effective score', () => {
    const cands = [
      makeCandidate({ id: 'low', cluster: 'cluster-d', status: 'proposed', scores: { feasibility: 5, elegance: 5, containment: 5, value: 5 }, rationale: 'Low.' }),
      makeCandidate({ id: 'high', cluster: 'cluster-d', status: 'proposed', scores: { feasibility: 9, elegance: 9, containment: 9, value: 9 }, rationale: 'High.' }),
    ];
    const p = buildRefreshGoalsPrompt({ goals, candidates: cands, charterContent: charterCtx, filePath: '/f.cnj' });
    expect(p.indexOf('high')).toBeLessThan(p.indexOf('low'));
  });
});

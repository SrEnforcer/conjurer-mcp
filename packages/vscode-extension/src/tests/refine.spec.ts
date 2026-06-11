import { describe, it, expect } from 'vitest';
import { extractFormContent, buildRefinePrompt, buildResolveOpenPrompt } from '../commands/refine.js';

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
    const p = buildRefinePrompt('target', 'my-app', '(target "my-app")', '/proj/design.cnj');
    expect(p).toContain('Form type: target');
    expect(p).toContain('Form name: my-app');
  });

  it('includes the file path', () => {
    const p = buildRefinePrompt('spell', 'my-spell', '(spell my-spell)', '/proj/mcp.cnj');
    expect(p).toContain('/proj/mcp.cnj');
  });

  it('includes the form content verbatim', () => {
    const content = '(target "app" :produces ["lib"])';
    const p = buildRefinePrompt('target', 'app', content, '/f.cnj');
    expect(p).toContain(content);
  });

  it('includes target-specific guidance for target forms', () => {
    const p = buildRefinePrompt('target', 'app', '(target "app")', '/f.cnj');
    expect(p).toContain(':modules');
    expect(p).toContain(':produces');
  });

  it('includes spell-specific guidance for spell forms', () => {
    const p = buildRefinePrompt('spell', 'my-spell', '(spell my-spell)', '/f.cnj');
    expect(p).toContain(':requires');
    expect(p).toContain(':manifest');
  });

  it('includes charter-specific guidance for charter forms', () => {
    const p = buildRefinePrompt('charter', 'My Project', '(charter "My Project")', '/f.cnj');
    expect(p).toContain(':goals');
    expect(p).toContain(':decisions');
  });

  it('includes the refine key parameters in the prompt', () => {
    const p = buildRefinePrompt('asset', 'Spec', '(asset "Spec")', '/f.cnj');
    expect(p).toContain(':focus-on');
    expect(p).toContain(':add');
    expect(p).toContain(':adjust');
    expect(p).toContain(':without');
  });

  it('uses default guidance for unknown form types', () => {
    const p = buildRefinePrompt('ritual', 'my-ritual', '(ritual my-ritual)', '/f.cnj');
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

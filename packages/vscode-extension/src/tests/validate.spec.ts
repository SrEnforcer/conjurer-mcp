import { describe, it, expect } from 'vitest';
import type { Violation } from '@conjurer/core';
import { mapViolationToDiagnostic, extractOpenQuestions, summarizeViolations } from '../commands/validate.js';

const makeV = (rule: string, severity: 'error' | 'warning', message: string): Violation => ({
  rule,
  severity,
  location: 'charter',
  message,
});

describe('mapViolationToDiagnostic', () => {
  it('maps error violation to DiagnosticInfo', () => {
    const v = makeV('charter-title', 'error', 'Charter must have a non-empty title');
    const info = mapViolationToDiagnostic(v);
    expect(info.severity).toBe('error');
    expect(info.message).toContain('charter-title');
    expect(info.message).toContain('Charter must have a non-empty title');
  });

  it('maps warning violation to DiagnosticInfo', () => {
    const v = makeV('charter-goals', 'warning', 'Should declare at least one goal');
    const info = mapViolationToDiagnostic(v);
    expect(info.severity).toBe('warning');
    expect(info.message).toContain('charter-goals');
  });

  it('prefixes message with rule name', () => {
    const v = makeV('target-name', 'error', 'Target must have a non-empty name');
    const info = mapViolationToDiagnostic(v);
    expect(info.message).toMatch(/^\[target-name\]/);
  });

  it('sets line to 0 (default)', () => {
    const v = makeV('charter-version', 'error', 'Version must be semver');
    const info = mapViolationToDiagnostic(v);
    expect(info.line).toBe(0);
  });
});

describe('extractOpenQuestions', () => {
  it('returns open questions from valid charter', () => {
    const source = `
(charter
  "Demo"
  :version "0.1.0"
  :goals ["Ship"]
  :open ["Q1" "Q2"]
  :decisions [])
`;
    const result = extractOpenQuestions(source, 'demo.cnj');
    expect('questions' in result).toBe(true);
    if ('questions' in result) {
      expect(result.questions).toEqual(['Q1', 'Q2']);
    }
  });

  it('returns parse error for invalid source', () => {
    const result = extractOpenQuestions('(charter', 'broken.cnj');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/^Parse error:/);
    }
  });
});

describe('summarizeViolations', () => {
  it('counts errors and warnings correctly', () => {
    const summary = summarizeViolations([
      makeV('a', 'error', 'x'),
      makeV('b', 'warning', 'y'),
      makeV('c', 'error', 'z'),
    ]);
    expect(summary).toEqual({ errors: 2, warnings: 1, total: 3 });
  });

  it('returns zeros for empty violations', () => {
    const summary = summarizeViolations([]);
    expect(summary).toEqual({ errors: 0, warnings: 0, total: 0 });
  });
});

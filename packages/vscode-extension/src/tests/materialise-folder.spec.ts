import { describe, it, expect } from 'vitest';
import type { MaterialisePreflightReport } from '@conjurer/core';
import { formatPreflightReport, notReadyMessage } from '../commands/materialise-folder.js';

const makeReport = (
  overrides: Partial<MaterialisePreflightReport> = {},
): MaterialisePreflightReport => ({
  projectName: 'test-proj',
  packageJsonRequired: true,
  resolvedRefs: [],
  unresolvedRefs: [],
  missingPaths: [],
  unreadableFiles: [],
  ready: true,
  ...overrides,
});

describe('formatPreflightReport — status', () => {
  it('includes project name', () => {
    const report = makeReport({ projectName: 'my-proj' });
    expect(formatPreflightReport(report)).toContain('my-proj');
  });

  it('shows YES when ready', () => {
    expect(formatPreflightReport(makeReport({ ready: true }))).toContain('YES');
  });

  it('shows NO when not ready', () => {
    expect(formatPreflightReport(makeReport({ ready: false }))).toContain('NO');
  });
});

describe('formatPreflightReport — refs and paths', () => {
  it('lists resolved refs count and details', () => {
    const report = makeReport({
      resolvedRefs: [{ from: 'a.cnj', to: 'b.cnj', outsideFolder: false }],
    });
    const text = formatPreflightReport(report);
    expect(text).toContain('Resolved refs: 1');
    expect(text).toContain('a.cnj');
  });

  it('lists unresolved refs with reason', () => {
    const report = makeReport({
      ready: false,
      unresolvedRefs: [{ from: 'a.cnj', target: 'missing', reason: 'not found' }],
    });
    const text = formatPreflightReport(report);
    expect(text).toContain('Unresolved refs: 1');
    expect(text).toContain('missing');
    expect(text).toContain('not found');
  });

  it('marks outside-folder refs', () => {
    const report = makeReport({
      resolvedRefs: [{ from: 'a.cnj', to: '/other/b.cnj', outsideFolder: true }],
    });
    expect(formatPreflightReport(report)).toContain('(outside folder)');
  });

  it('lists missing paths', () => {
    const report = makeReport({
      missingPaths: [{ path: 'src/missing.ts', reason: 'file not found' }],
    });
    const text = formatPreflightReport(report);
    expect(text).toContain('Missing paths: 1');
    expect(text).toContain('src/missing.ts');
  });
});

describe('formatPreflightReport — unreadable files', () => {
  it('lists each unreadable file with its reason', () => {
    const report = makeReport({
      ready: false,
      unreadableFiles: [{ path: 'design/broken.cnj', reason: 'Parse error at 3:12: Expected rparen' }],
    });
    const text = formatPreflightReport(report);
    expect(text).toContain('Unreadable files: 1');
    expect(text).toContain('design/broken.cnj: Parse error at 3:12: Expected rparen');
  });
});

describe('notReadyMessage', () => {
  const unreadable = [{ path: 'a.cnj', reason: 'File not found' }];
  const unresolved = [{ from: 'b.cnj', target: 'x', reason: 'not declared' }];

  it('names unreadable files when they are the only blocker', () => {
    expect(notReadyMessage(makeReport({ ready: false, unreadableFiles: unreadable })))
      .toBe('Preflight found 1 unreadable file(s). See Output panel.');
  });

  it('names unresolved references when they are the only blocker', () => {
    expect(notReadyMessage(makeReport({ ready: false, unresolvedRefs: unresolved })))
      .toBe('Preflight found 1 unresolved reference(s). See Output panel.');
  });

  it('names both when both block', () => {
    expect(notReadyMessage(makeReport({ ready: false, unreadableFiles: unreadable, unresolvedRefs: unresolved })))
      .toBe('Preflight found 1 unreadable file(s) and 1 unresolved reference(s). See Output panel.');
  });
});

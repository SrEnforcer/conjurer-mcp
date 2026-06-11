import { describe, it, expect } from 'vitest';
import type { MaterialisePreflightReport } from '@conjurer/core';
import { formatPreflightReport } from '../commands/materialise-folder.js';

const makeReport = (
  overrides: Partial<MaterialisePreflightReport> = {},
): MaterialisePreflightReport => ({
  projectName: 'test-proj',
  packageJsonRequired: true,
  resolvedRefs: [],
  unresolvedRefs: [],
  missingPaths: [],
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

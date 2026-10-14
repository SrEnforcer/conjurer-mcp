/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): inline assertion helper shapes in tests prioritize readability over readonly wrappers. */
import { describe, it, expect, vi } from 'vitest';
import { handleLintDiskConsistency } from '../../tools/validate.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const LintDiskSchema = z.looseObject({
  consistent: z.boolean(),
  issue_count: z.number(),
  modules: z.looseObject({
    declared: z.number(),
    found: z.number(),
    missing: z.array(z.looseObject({ module: z.string(), target: z.string() })),
  }),
  references: z.looseObject({
    declared: z.number(),
    found: z.number(),
    missing: z.array(z.looseObject({ ref: z.string() })),
  }),
});

const CHARTER_ONLY = `(charter "P" :version "1.0.0" :goals ["g"])`;

const WITH_MODULES = `
(charter "P" :version "1.0.0" :goals ["g"] :references ["other.cnj"])
(target :shared-core
  :language :typescript
  :standard :tsf-plus-plus
  :produces [:library]
  :modules [{:module "parser.ts" :est-lines 200}
            {:module "types.ts"  :est-lines 100}])
(target :server
  :language :typescript
  :standard :tsf-plus-plus
  :produces [:executable]
  :from :shared-core
  :modules [{:module "server.ts" :est-lines 120}])
`;

const WITH_MISSING_MODULE = `
(charter "P" :version "1.0.0" :goals ["g"])
(target :core
  :language :typescript
  :standard :tsf-plus-plus
  :produces [:library]
  :modules [{:module "present.ts" :est-lines 100}
            {:module "absent.ts"  :est-lines 80}])
`;

const WITH_BAD_REF = `
(charter "P" :version "1.0.0" :goals ["g"] :references ["missing-ref.cnj"])
`;

const WITH_BOTH_ISSUES = `
(charter "P" :version "1.0.0" :goals ["g"] :references ["missing-ref.cnj"])
(target :core
  :language :typescript
  :standard :tsf-plus-plus
  :produces [:library]
  :modules [{:module "ghost.ts" :est-lines 50}])
`;

// Declares a module with a subdirectory prefix: 'tools/server.ts'
const WITH_SUBDIR_MODULE = `
(charter "P" :version "1.0.0" :goals ["g"])
(target :server
  :language :typescript
  :standard :tsf-plus-plus
  :produces [:executable]
  :modules [{:module "tools/server.ts" :est-lines 120}])
`;

// Filesystem layout for the virtual filesystem:
//   /vfs/lint/main.cnj   — WITH_MODULES (modules: parser.ts, types.ts, server.ts)
//   /vfs/lint/other.cnj  — referenced file that exists
//   /vfs/lint/src/parser.ts, src/types.ts, src/server.ts — module files
//   /vfs/lint/missing.cnj — WITH_MISSING_MODULE (absent.ts is not in the tree)
//   /vfs/lint/present.ts  — exists
//   /vfs/lint/bad-ref.cnj — WITH_BAD_REF (ref does not exist)
//   /vfs/lint/both.cnj    — WITH_BOTH_ISSUES

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => [
    '/vfs/lint/main.cnj', '/vfs/lint/other.cnj', '/vfs/lint/empty.cnj', '/vfs/lint/missing.cnj',
    '/vfs/lint/bad-ref.cnj', '/vfs/lint/both.cnj', '/vfs/lint/sub.cnj', '/vfs/lint/present.ts',
  ].includes(path),
  readFileSync: (path: string): string => {
    const files: Record<string, string> = {
      '/vfs/lint/main.cnj': WITH_MODULES,
      '/vfs/lint/empty.cnj': CHARTER_ONLY,
      '/vfs/lint/missing.cnj': WITH_MISSING_MODULE,
      '/vfs/lint/bad-ref.cnj': WITH_BAD_REF,
      '/vfs/lint/both.cnj': WITH_BOTH_ISSUES,
      '/vfs/lint/sub.cnj': WITH_SUBDIR_MODULE,
    };
    return files[path] ?? '';
  },
  readdirSync: (root: string): string[] => {
    // /vfs/lint — flat project tree (used by most tests)
    //   src/parser.ts, src/types.ts, src/server.ts (declared in main.cnj)
    //   present.ts (declared in missing.cnj)
    //   node_modules/pkg/index.ts — excluded by SKIP_DIRS
    // /vfs/lint/sub — subdirectory-prefix test (tools/server.ts declared in sub.cnj)
    //   src/tools/server.ts — matched via suffix 'tools/server.ts'
    if (root === '/vfs/lint') {
      return [
        'src/parser.ts',
        'src/types.ts',
        'src/server.ts',
        'present.ts',
        'node_modules/pkg/index.ts',
      ];
    }
    if (root === '/vfs/lint/sub') {
      return ['src/tools/server.ts'];
    }
    return [];
  },
}));

describe('handleLintDiskConsistency — file access', () => {
  it('returns file-not-found for missing file', () => {
    const r = handleLintDiskConsistency('/vfs/lint/absent.cnj');
    expect(r[0]?.text).toMatch(/File not found/);
  });
});

describe('handleLintDiskConsistency — consistent result', () => {
  it('reports consistent=true when all declared modules are found', () => {
    const r = handleLintDiskConsistency('/vfs/lint/main.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.consistent).toBe(true);
    expect(d.issue_count).toBe(0);
  });

  it('reports all three declared modules as found', () => {
    const r = handleLintDiskConsistency('/vfs/lint/main.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.modules.declared).toBe(3);
    expect(d.modules.found).toBe(3);
    expect(d.modules.missing).toHaveLength(0);
  });

  it('reports the referenced file as found', () => {
    const r = handleLintDiskConsistency('/vfs/lint/main.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.references.declared).toBe(1);
    expect(d.references.found).toBe(1);
    expect(d.references.missing).toHaveLength(0);
  });
});

describe('handleLintDiskConsistency — missing module', () => {
  it('reports consistent=false when a module file is missing', () => {
    const r = handleLintDiskConsistency('/vfs/lint/missing.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.consistent).toBe(false);
    expect(d.issue_count).toBe(1);
  });

  it('names the missing module in the output', () => {
    const r = handleLintDiskConsistency('/vfs/lint/missing.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    const missingNames = d.modules.missing.map((m) => m.module);
    expect(missingNames).toContain('absent.ts');
    expect(missingNames).not.toContain('present.ts');
  });

  it('includes the target name for each missing module', () => {
    const r = handleLintDiskConsistency('/vfs/lint/missing.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    const entry = d.modules.missing[0];
    expect(entry?.target).toBe('core');
    expect(entry?.module).toBe('absent.ts');
  });
});

describe('handleLintDiskConsistency — missing reference', () => {
  it('reports consistent=false for a missing charter reference', () => {
    const r = handleLintDiskConsistency('/vfs/lint/bad-ref.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.consistent).toBe(false);
    expect(d.references.missing).toHaveLength(1);
    expect(d.references.missing[0]?.ref).toBe('missing-ref.cnj');
  });
});

describe('handleLintDiskConsistency — multiple issues', () => {
  it('accumulates both module and reference failures', () => {
    const r = handleLintDiskConsistency('/vfs/lint/both.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.consistent).toBe(false);
    expect(d.issue_count).toBe(2);
    expect(d.modules.missing).toHaveLength(1);
    expect(d.references.missing).toHaveLength(1);
  });
});

describe('handleLintDiskConsistency — no targets', () => {
  it('reports consistent=true for a charter-only file with no modules', () => {
    const r = handleLintDiskConsistency('/vfs/lint/empty.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.consistent).toBe(true);
    expect(d.modules.declared).toBe(0);
    expect(d.references.declared).toBe(0);
  });
});

describe('handleLintDiskConsistency — node_modules exclusion', () => {
  it('does not count node_modules entries as valid module matches', () => {
    // node_modules/pkg/index.ts is in the tree but should be excluded
    // ghost.ts is not in the tree at all (both.cnj test case covers this)
    const r = handleLintDiskConsistency('/vfs/lint/both.cnj', '/vfs/lint');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.modules.missing[0]?.module).toBe('ghost.ts');
  });
});

describe('handleLintDiskConsistency — subdirectory module names', () => {
  it('matches declared module "tools/server.ts" against a file at "src/tools/server.ts" in the tree', () => {
    // The readdirSync mock returns 'src/tools/server.ts' for /vfs/lint/sub root.
    // Declared module is 'tools/server.ts' — suffix match should succeed.
    const r = handleLintDiskConsistency('/vfs/lint/sub.cnj', '/vfs/lint/sub');
    const d = parseToolJson(r, LintDiskSchema);
    expect(d.modules.found).toBe(1);
    expect(d.modules.missing).toHaveLength(0);
  });
});

/* eslint-disable max-lines-per-function -- DEVIATION(3.4): integration-like scenario assertions remain grouped to preserve workspace-flow context. */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): inline assertion helper shapes in tests prioritize readability over readonly wrappers. */
import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElseOption } from '@tsfpp/prelude';
import { handleResolve, handlePreflight } from '../../tools/project.js';
import { handleLensDependencyGraph, handleWorkspaceSummary, handleLensOpenQuestions } from '../../tools/lenses.js';
import { parseFirstToolObject } from './tool-json.js';

const VALID = `(charter "P" :version "1.0.0" :goals ["g"])\n(target "app" :language "ts" :standard "esm" :produces ["lib"] :modules [])`;
const BAD_EDN = `(charter bad edn ::`;

// A two-file workspace: leaf depends on core via :from
const CORE_CNJ = [
  '(charter "Core" :version "1.0.0" :goals ["g"]',
  '  :decisions [{:date "2026-01-01" :decision "first"} {:date "2026-06-01" :decision "second"}]',
  '  :open ["pending"])',
  '(target "core" :language "ts" :standard "esm" :produces ["lib"] :modules [])',
].join('\n');
const LEAF_CNJ = [
  '(charter "Leaf" :version "1.0.0" :goals ["g"] :references ["/vfs/graph/core.cnj"])',
  '(target "leaf" :language "ts" :standard "esm" :produces ["lib"] :modules [] :from "core")',
].join('\n');

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/resolve/proj.cnj': VALID,
  '/vfs/pkg/proj.cnj': VALID,
  '/vfs/graph/leaf.cnj': LEAF_CNJ,
  '/vfs/graph/core.cnj': CORE_CNJ,
};

const virtualDirs: Readonly<Record<string, ReadonlyArray<string>>> = {
  '/vfs/resolve': ['proj.cnj'],
  '/vfs/pkg': ['proj.cnj'],
  '/vfs/empty': [],
  '/vfs/graph': ['leaf.cnj', 'core.cnj'],
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path)
    || Object.prototype.hasOwnProperty.call(virtualDirs, path),
  readFileSync: (path: string): string => getOrElseOption(() => '')(fromNullable(virtualFiles[path])),
  readdirSync: (path: string): ReadonlyArray<string> => getOrElseOption<ReadonlyArray<string>>(() => [])(fromNullable(virtualDirs[path])),
}));

describe('handleResolve — inline', () => {
  it('returns error when no input given', () => {
    const r = handleResolve();
    expect(r[0]?.text).toBe('Provide file or content');
  });

  it('resolves inline content into a plan', () => {
    const r = handleResolve(undefined, VALID);
    const d = parseFirstToolObject(r);
    expect(d.plan).toHaveLength(1);
    expect(d.plan[0]?.name).toBe('app');
    expect(d.unresolved).toEqual([]);
  });

  it('returns parse error for bad EDN', () => {
    const r = handleResolve(undefined, BAD_EDN);
    expect(r[0]?.text).toMatch(/Parse error/);
  });
});

describe('handleResolve — file path', () => {
  it('resolves from file path', () => {
    const r = handleResolve('/vfs/resolve/proj.cnj');
    const d = parseFirstToolObject(r);
    expect(d.plan).toHaveLength(1);
  });
});

describe('handlePreflight', () => {
  it('returns error for folder with no cnj files', () => {
    const r = handlePreflight('/vfs/empty');
    expect(r[0]?.text).toMatch(/No .cnj files found/);
  });

  it('returns ready report for valid folder', () => {
    const r = handlePreflight('/vfs/pkg', 'my-project');
    const d = parseFirstToolObject(r);
    expect(d.project_name).toBe('my-project');
    expect(d.ready).toBe(true);
    expect(d.unresolved_refs).toHaveLength(0);
  });

  it('defaults project name to conjurer-mcp', () => {
    const r = handlePreflight('/vfs/pkg');
    const d = parseFirstToolObject(r);
    expect(d.project_name).toBe('conjurer-mcp');
  });
});

describe('handleLensDependencyGraph', () => {
  it('returns error for non-existent file', () => {
    const r = handleLensDependencyGraph('/vfs/no/such.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('returns nodes for each target in the workspace', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const names = d.nodes.map((n: { name: string }) => n.name);
    expect(names).toContain('leaf');
    expect(names).toContain('core');
  });

  it('includes an edge from core to leaf', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const edge = d.edges.find(
      (e: { from: string; to: string }) => e.from === 'core' && e.to === 'leaf',
    );
    expect(edge).toBeDefined();
  });

  it('returns topo_order with core before leaf', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const coreIdx = d.topo_order.indexOf('core');
    const leafIdx = d.topo_order.indexOf('leaf');
    expect(coreIdx).toBeGreaterThanOrEqual(0);
    expect(leafIdx).toBeGreaterThan(coreIdx);
  });

  it('reports cycle_detected false for valid graph', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.cycle_detected).toBe(false);
  });

  it('groups targets by source file in by_file', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.by_file['/vfs/graph/leaf.cnj']).toContain('leaf');
    expect(d.by_file['/vfs/graph/core.cnj']).toContain('core');
  });

  it('narrows to subgraph when target filter is given', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj', 'core');
    const d = parseFirstToolObject(r);
    const names = d.nodes.map((n: { name: string }) => n.name);
    expect(names).toContain('core');
    expect(names).not.toContain('leaf');
  });

  it('returns single node with no edges for isolated target', () => {
    const r = handleLensDependencyGraph('/vfs/resolve/proj.cnj');
    const d = parseFirstToolObject(r);
    expect(d.nodes).toHaveLength(1);
    expect(d.edges).toHaveLength(0);
  });
});

describe('handleWorkspaceSummary', () => {
  it('returns workspace error for non-existent file', () => {
    const r = handleWorkspaceSummary('/vfs/no/such.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('includes all discovered files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const filePaths = d.files.map((f: { file: string }) => f.file);
    expect(filePaths).toContain('/vfs/graph/leaf.cnj');
    expect(filePaths).toContain('/vfs/graph/core.cnj');
  });

  it('reports correct target count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const core = d.files.find((f: { file: string }) => f.file === '/vfs/graph/core.cnj');
    expect(core?.targets).toBe(1);
  });

  it('reports correct decision count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const core = d.files.find((f: { file: string }) => f.file === '/vfs/graph/core.cnj');
    expect(core?.decisions).toBe(2);
  });

  it('reports correct open question count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const core = d.files.find((f: { file: string }) => f.file === '/vfs/graph/core.cnj');
    expect(core?.open).toBe(1);
  });

  it('reports valid true for well-formed files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.files.every((f: { valid: boolean }) => f.valid)).toBe(true);
  });

  it('totals target count across all files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.totals.targets).toBe(2); // leaf:1 + core:1
  });

  it('totals decision count across all files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.totals.decisions).toBe(2); // core has 2, leaf has 0
  });

  it('totals.valid_files equals file count for healthy workspace', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.totals.valid_files).toBe(d.totals.files);
    expect(d.totals.invalid_files).toBe(0);
  });
});

describe('handleLensOpenQuestions', () => {
  it('returns workspace error for non-existent file', () => {
    const r = handleLensOpenQuestions('/vfs/no/such.cnj');
    expect(r[0]?.text).toMatch(/error|not found/i);
  });

  it('reports total_files_scanned for the whole workspace', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_files_scanned).toBe(2); // leaf + core
  });

  it('only includes files that have open questions', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    // leaf has no open questions; core has one
    const filePaths = d.files_with_open.map((f: { file: string }) => f.file);
    expect(filePaths).toContain('/vfs/graph/core.cnj');
    expect(filePaths).not.toContain('/vfs/graph/leaf.cnj');
  });

  it('returns the open question text in the file entry', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const core = d.files_with_open.find((f: { file: string }) => f.file === '/vfs/graph/core.cnj');
    expect(core?.open).toContain('pending');
  });

  it('reports the correct total_open count', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    expect(d.total_open).toBe(1);
  });

  it('returns empty files_with_open for workspace with no open questions', () => {
    const r = handleLensOpenQuestions('/vfs/resolve/proj.cnj');
    const d = parseFirstToolObject(r);
    expect(d.files_with_open).toHaveLength(0);
    expect(d.total_open).toBe(0);
  });

  it('includes the file title in each entry', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseFirstToolObject(r);
    const core = d.files_with_open.find((f: { file: string }) => f.file === '/vfs/graph/core.cnj');
    expect(core?.title).toBe('Core');
  });
});

/* eslint-disable max-lines-per-function -- DEVIATION(3.4): integration-like scenario assertions remain grouped to preserve workspace-flow context. */
import { describe, it, expect, vi } from 'vitest';
import { fromNullable, getOrElseOption } from '@tsfpp/prelude';
import { handleResolve, handlePreflight } from '../../tools/project.js';
import { handleLensDependencyGraph, handleWorkspaceSummary, handleLensOpenQuestions } from '../../tools/lenses.js';
import { z } from 'zod';
import { parseToolJson } from './tool-json.js';

const Names = z.array(z.string());
const ResolveSchema = z.looseObject({
  plan: z.array(z.looseObject({ name: z.string() })),
  unresolved: z.array(z.unknown()),
});
const PreflightSchema = z.looseObject({
  project_name: z.string(),
  ready: z.boolean(),
  unresolved_refs: z.array(z.unknown()),
  unreadable_files: z.array(z.looseObject({ path: z.string(), reason: z.string() })),
});
const DependencyGraphSchema = z.looseObject({
  nodes: z.array(z.looseObject({ name: z.string() })),
  edges: z.array(z.looseObject({ from: z.string(), to: z.string() })),
  topo_order: Names,
  cycle_detected: z.boolean(),
  by_file: z.record(z.string(), Names),
});
const WorkspaceSummarySchema = z.looseObject({
  files: z.array(z.looseObject({
    file: z.string(), targets: z.number(), decisions: z.number(), open: z.number(), valid: z.boolean(),
  })),
  totals: z.looseObject({
    files: z.number(), targets: z.number(), decisions: z.number(), valid_files: z.number(), invalid_files: z.number(),
  }),
});
const OpenQuestionsSchema = z.looseObject({
  total_files_scanned: z.number(),
  total_open: z.number(),
  files_with_open: z.array(z.looseObject({ file: z.string(), title: z.string(), open: Names })),
});

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
  '/vfs/partly/proj.cnj': VALID,
  '/vfs/partly/broken.cnj': BAD_EDN,
  '/vfs/graph/leaf.cnj': LEAF_CNJ,
  '/vfs/graph/core.cnj': CORE_CNJ,
};

const virtualDirs: Readonly<Record<string, ReadonlyArray<string>>> = {
  '/vfs/resolve': ['proj.cnj'],
  '/vfs/pkg': ['proj.cnj'],
  '/vfs/partly': ['proj.cnj', 'broken.cnj'],
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
    const d = parseToolJson(r, ResolveSchema);
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
    const d = parseToolJson(r, ResolveSchema);
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
    const d = parseToolJson(r, PreflightSchema);
    expect(d.project_name).toBe('my-project');
    expect(d.ready).toBe(true);
    expect(d.unresolved_refs).toHaveLength(0);
  });

  it('reports an unreadable .cnj with its reason and is not ready', () => {
    const d = parseToolJson(handlePreflight('/vfs/partly'), PreflightSchema);
    expect(d.unreadable_files.map((u) => u.path)).toEqual(['/vfs/partly/broken.cnj']);
    expect(d.unreadable_files[0]?.reason).toMatch(/^Parse error at 1:\d+: /);
    expect(d.ready).toBe(false);
  });

  it('reports no unreadable files for a folder that reads cleanly', () => {
    const d = parseToolJson(handlePreflight('/vfs/pkg'), PreflightSchema);
    expect(d.unreadable_files).toEqual([]);
  });

  it('defaults project name to conjurer-mcp', () => {
    const r = handlePreflight('/vfs/pkg');
    const d = parseToolJson(r, PreflightSchema);
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
    const d = parseToolJson(r, DependencyGraphSchema);
    const names = d.nodes.map((n) => n.name);
    expect(names).toContain('leaf');
    expect(names).toContain('core');
  });

  it('includes an edge from core to leaf', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, DependencyGraphSchema);
    const edge = d.edges.find(
      (e) => e.from === 'core' && e.to === 'leaf',
    );
    expect(edge).toBeDefined();
  });

  it('returns topo_order with core before leaf', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, DependencyGraphSchema);
    const coreIdx = d.topo_order.indexOf('core');
    const leafIdx = d.topo_order.indexOf('leaf');
    expect(coreIdx).toBeGreaterThanOrEqual(0);
    expect(leafIdx).toBeGreaterThan(coreIdx);
  });

  it('reports cycle_detected false for valid graph', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, DependencyGraphSchema);
    expect(d.cycle_detected).toBe(false);
  });

  it('groups targets by source file in by_file', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, DependencyGraphSchema);
    expect(d.by_file['/vfs/graph/leaf.cnj']).toContain('leaf');
    expect(d.by_file['/vfs/graph/core.cnj']).toContain('core');
  });

  it('narrows to subgraph when target filter is given', () => {
    const r = handleLensDependencyGraph('/vfs/graph/leaf.cnj', 'core');
    const d = parseToolJson(r, DependencyGraphSchema);
    const names = d.nodes.map((n) => n.name);
    expect(names).toContain('core');
    expect(names).not.toContain('leaf');
  });

  it('returns single node with no edges for isolated target', () => {
    const r = handleLensDependencyGraph('/vfs/resolve/proj.cnj');
    const d = parseToolJson(r, DependencyGraphSchema);
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
    const d = parseToolJson(r, WorkspaceSummarySchema);
    const filePaths = d.files.map((f) => f.file);
    expect(filePaths).toContain('/vfs/graph/leaf.cnj');
    expect(filePaths).toContain('/vfs/graph/core.cnj');
  });

  it('reports correct target count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    const core = d.files.find((f) => f.file === '/vfs/graph/core.cnj');
    expect(core?.targets).toBe(1);
  });

  it('reports correct decision count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    const core = d.files.find((f) => f.file === '/vfs/graph/core.cnj');
    expect(core?.decisions).toBe(2);
  });

  it('reports correct open question count per file', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    const core = d.files.find((f) => f.file === '/vfs/graph/core.cnj');
    expect(core?.open).toBe(1);
  });

  it('reports valid true for well-formed files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    expect(d.files.every((f) => f.valid)).toBe(true);
  });

  it('totals target count across all files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    expect(d.totals.targets).toBe(2); // leaf:1 + core:1
  });

  it('totals decision count across all files', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
    expect(d.totals.decisions).toBe(2); // core has 2, leaf has 0
  });

  it('totals.valid_files equals file count for healthy workspace', () => {
    const r = handleWorkspaceSummary('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, WorkspaceSummarySchema);
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
    const d = parseToolJson(r, OpenQuestionsSchema);
    expect(d.total_files_scanned).toBe(2); // leaf + core
  });

  it('only includes files that have open questions', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, OpenQuestionsSchema);
    // leaf has no open questions; core has one
    const filePaths = d.files_with_open.map((f) => f.file);
    expect(filePaths).toContain('/vfs/graph/core.cnj');
    expect(filePaths).not.toContain('/vfs/graph/leaf.cnj');
  });

  it('returns the open question text in the file entry', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, OpenQuestionsSchema);
    const core = d.files_with_open.find((f) => f.file === '/vfs/graph/core.cnj');
    expect(core?.open).toContain('pending');
  });

  it('reports the correct total_open count', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, OpenQuestionsSchema);
    expect(d.total_open).toBe(1);
  });

  it('returns empty files_with_open for workspace with no open questions', () => {
    const r = handleLensOpenQuestions('/vfs/resolve/proj.cnj');
    const d = parseToolJson(r, OpenQuestionsSchema);
    expect(d.files_with_open).toHaveLength(0);
    expect(d.total_open).toBe(0);
  });

  it('includes the file title in each entry', () => {
    const r = handleLensOpenQuestions('/vfs/graph/leaf.cnj');
    const d = parseToolJson(r, OpenQuestionsSchema);
    const core = d.files_with_open.find((f) => f.file === '/vfs/graph/core.cnj');
    expect(core?.title).toBe('Core');
  });
});

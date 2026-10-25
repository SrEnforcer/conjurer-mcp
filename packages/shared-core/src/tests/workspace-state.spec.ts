import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolve } from 'node:path';
import { isOk, isErr } from '@tsfpp/prelude';
import { buildWorkspaceSnapshot, topoOrder, computeContextKey, isCnjFileReference } from '../workspace-state.js';

const DESIGN_DIR = resolve(__dirname, '..', '..', '..', '..', 'design');
const MCP_SERVER_CNJ = resolve(DESIGN_DIR, 'mcp-server.cnj');
const CONJURER_CNJ = resolve(DESIGN_DIR, 'conjurer-mcp.cnj');

describe('buildWorkspaceSnapshot', () => {
  it('returns err for a non-existent file', () => {
    const r = buildWorkspaceSnapshot('/does/not/exist.cnj');
    expect(isErr(r)).toBe(true);
  });

  it('discovers the entry file', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.files.has(MCP_SERVER_CNJ)).toBe(true);
  });

  it('follows charter :references one level', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    // mcp-server.cnj references conjurer-mcp.cnj
    expect(r.value.files.has(CONJURER_CNJ)).toBe(true);
  });

  it('builds the target dependency graph from :from fields', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const edges = r.value.targetEdges;
    // mcp-server depends on shared-core
    expect(edges.has('mcp-server')).toBe(true);
    expect(edges.get('mcp-server')).toContain('shared-core');
    // shared-core has no from
    expect(edges.get('shared-core')).toEqual([]);
  });

  it('reports no cycles in the design files', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.cycleDetected).toBe(false);
  });
});

describe('topoOrder', () => {
  it('returns shared-core before mcp-server', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const order = topoOrder(r.value, MCP_SERVER_CNJ);
    const sharedIdx = order.indexOf('shared-core');
    const serverIdx = order.indexOf('mcp-server');
    expect(sharedIdx).toBeGreaterThanOrEqual(0);
    expect(serverIdx).toBeGreaterThan(sharedIdx);
  });

  it('returns empty array for unknown entry file', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const order = topoOrder(r.value, '/no/such/file.cnj');
    expect(order).toHaveLength(0);
  });
});

describe('computeContextKey', () => {
  it('returns a 16-char hex string', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const key = computeContextKey(r.value, [MCP_SERVER_CNJ]);
    expect(key).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns the same key for the same snapshot', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const k1 = computeContextKey(r.value, [MCP_SERVER_CNJ]);
    const k2 = computeContextKey(r.value, [MCP_SERVER_CNJ]);
    expect(k1).toBe(k2);
  });

  it('returns different keys for different file sets', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const k1 = computeContextKey(r.value, [MCP_SERVER_CNJ]);
    const k2 = computeContextKey(r.value, [MCP_SERVER_CNJ, CONJURER_CNJ]);
    expect(k1).not.toBe(k2);
  });
});

describe('buildWorkspaceSnapshot — unreadable referenced files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cnj-ws-'));
  const entry = join(dir, 'entry.cnj');

  beforeAll(() => {
    writeFileSync(entry, '(charter "E" :version "1.0.0" :goals ["g"] :references ["a.cnj" "broken.cnj" "missing.cnj" "README.md" "https://example.com/spec.cnj"])');
    writeFileSync(join(dir, 'a.cnj'), '(charter "A" :version "1.0.0" :goals ["g"] :references ["broken.cnj"])\n(target "a" :language "ts")');
    writeFileSync(join(dir, 'broken.cnj'), '(target "lost" :language "ts"');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('follows only local .cnj references, so a URL or a README is not reported as unreadable', () => {
    const r = buildWorkspaceSnapshot(entry);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.unreadableFiles.map((u) => u.path)).toEqual([join(dir, 'broken.cnj'), join(dir, 'missing.cnj')]);
  });

  it('reports each unreadable file once, with its reason, and keeps the readable ones', () => {
    const r = buildWorkspaceSnapshot(entry);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(Array.from(r.value.files.keys())).toEqual([entry, join(dir, 'a.cnj')]);
    expect(r.value.unreadableFiles).toEqual([
      { path: join(dir, 'broken.cnj'), reason: 'Parse error at 1:30: Expected rparen' },
      { path: join(dir, 'missing.cnj'), reason: 'File not found' },
    ]);
  });

  it('reports no unreadable files for the design workspace', () => {
    const r = buildWorkspaceSnapshot(MCP_SERVER_CNJ);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.unreadableFiles).toEqual([]);
  });
});

describe('isCnjFileReference', () => {
  it('accepts local .cnj paths and rejects URLs and other file types', () => {
    expect(['a.cnj', '../x/b.cnj', '/abs/c.cnj'].every(isCnjFileReference)).toBe(true);
    expect(['https://example.com/a.cnj', 'file:///a.cnj', 'README.md', 'src/index.ts', 'https://www.npmjs.com/package/@tsfpp/standard']
      .some(isCnjFileReference)).toBe(false);
  });
});

describe('buildWorkspaceSnapshot — scale and unreadable paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cnj-ws-scale-'));
  const many = join(dir, 'many.cnj');
  const chain = join(dir, 'chain.cnj');
  const withDir = join(dir, 'with-dir.cnj');
  const CHAIN = 10_000;

  beforeAll(() => {
    const refs = Array.from({ length: 30_000 }, (_, i) => `"missing-${i}.cnj"`).join(' ');
    writeFileSync(many, `(charter "M" :version "1.0.0" :goals ["g"] :references [${refs}])`);
    const targets = Array.from({ length: CHAIN }, (_, i) =>
      (i === 0 ? '(target t0 :language "ts")' : `(target t${i} :language "ts" :from t${i - 1})`)).join('\n');
    writeFileSync(chain, `(charter "C" :version "1.0.0" :goals ["g"])\n${targets}`);
    mkdirSync(join(dir, 'folder.cnj'));
    writeFileSync(withDir, '(charter "D" :version "1.0.0" :goals ["g"] :references ["folder.cnj"])');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('follows 30,000 references', () => {
    const r = buildWorkspaceSnapshot(many);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.unreadableFiles.length).toBe(30_000);
    expect(r.value.unreadableFiles[29_999]).toEqual({ path: join(dir, 'missing-29999.cnj'), reason: 'File not found' });
  });

  it('orders a :from chain of 10,000 targets', () => {
    const r = buildWorkspaceSnapshot(chain);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.cycleDetected).toBe(false);
    expect(topoOrder(r.value, chain)).toEqual(Array.from({ length: CHAIN }, (_, i) => `t${i}`));
  });

  it('reports a reference that is a directory as unreadable instead of throwing', () => {
    const r = buildWorkspaceSnapshot(withDir);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.unreadableFiles.map((u) => u.path)).toEqual([join(dir, 'folder.cnj')]);
    expect(r.value.unreadableFiles[0]?.reason).toMatch(/^Unreadable: .*EISDIR/);
  });
});

describe('topoOrder — order and cycles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cnj-ws-topo-'));
  const cyc = join(dir, 'cyc.cnj');
  const dag = join(dir, 'dag.cnj');
  const t = (name: string, from?: string): string => `(target ${name} :language "ts"${from !== undefined ? ` :from ${from}` : ''})`;

  beforeAll(() => {
    const charter = '(charter "X" :version "1.0.0" :goals ["g"])';
    writeFileSync(cyc, [charter, t('a', 'b'), t('d', 'b'), t('b', 'c'), t('c', 'a'), t('e', 'd'), t('f')].join('\n'));
    writeFileSync(dag, [charter, t('app', 'ui'), t('ui', 'core'), t('api', 'core'), t('core')].join('\n'));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('puts dependencies first, in declaration order otherwise', () => {
    const r = buildWorkspaceSnapshot(dag);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.cycleDetected).toBe(false);
    expect(topoOrder(r.value, dag)).toEqual(['core', 'ui', 'app', 'api']);
  });

  it('flags a cycle and still lists every target once', () => {
    const r = buildWorkspaceSnapshot(cyc);
    if (!isOk(r)) return expect.unreachable('expected a snapshot');
    expect(r.value.cycleDetected).toBe(true);
    expect(topoOrder(r.value, cyc)).toEqual(['c', 'b', 'a', 'd', 'e', 'f']);
  });
});

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { isOk, isErr } from '@tsfpp/prelude';
import { buildWorkspaceSnapshot, topoOrder, computeContextKey } from '../workspace-state.js';

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

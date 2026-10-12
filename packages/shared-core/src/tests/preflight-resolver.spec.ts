import { describe, it, expect, vi } from 'vitest';
import { isOk, isErr, intoMap } from '@tsfpp/prelude';
import { runMaterialisePreflight } from '../preflight-resolver.js';

type VirtualFs = {
  readonly files: ReadonlyMap<string, string>;
  readonly dirs: ReadonlyMap<string, ReadonlyArray<string>>;
};

const singleTarget = [
  '(charter "Single" :version "0.1.0" :goals ["one"])',
  '(target shared-core :language "TypeScript" :modules [{:name "types.ts"} {:name "index.ts"}])',
].join('\n');

const anchorDoc = [
  '(charter "Anchor" :version "0.1.0" :goals ["g1"])',
  '(target shared-core :language "TypeScript")',
].join('\n');

const serverDoc = [
  '(target mcp-server :language "TypeScript" :from shared-core)',
].join('\n');

const badDepDoc = [
  '(target consumer :language "TypeScript" :from does-not-exist)',
].join('\n');

// Q-14: a target built :from a d/model binding, a def, or a target written as a keyword.
const bindingDoc = [
  '(charter "Bindings" :version "0.1.0" :goals ["g"])',
  '(d/model "Subscription" :entities {:subscription {:type :aggregate-root}} :manifest subscription-model)',
  '(def billing-rules (r/rules :billing :rules []))',
  '(target :domain-lib :language :typescript :from subscription-model)',
  '(target :rules-lib :language :typescript :from billing-rules)',
  '(target :api :language :typescript :from :target/domain-lib)',
].join('\n');

const virtualFs: VirtualFs = {
  dirs: intoMap([
    ['/vfs', ['single', 'multi', 'missing', 'empty']],
    ['/vfs/single', ['project.cnj']],
    ['/vfs/multi', ['anchor.cnj', 'server.cnj']],
    ['/vfs/missing', ['bad.cnj']],
    ['/vfs/empty', []],
    ['/vfs/bindings', ['project.cnj']],
    ['/vfs/packages/shared-core/src', []],
  ]),
  files: intoMap([
    ['/vfs/single/project.cnj', singleTarget],
    ['/vfs/multi/anchor.cnj', anchorDoc],
    ['/vfs/multi/server.cnj', serverDoc],
    ['/vfs/missing/bad.cnj', badDepDoc],
    ['/vfs/bindings/project.cnj', bindingDoc],
  ]),
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean =>
    virtualFs.files.has(path) || virtualFs.dirs.has(path),
  readFileSync: (path: string): string => virtualFs.files.get(path) ?? '',
  readdirSync: (path: string): ReadonlyArray<string> => virtualFs.dirs.get(path) ?? [],
}));

describe('runMaterialisePreflight — errors', () => {
  it('returns err for non-existent folder', () => {
    const r = runMaterialisePreflight('/vfs/does-not-exist');
    expect(isErr(r)).toBe(true);
  });

  it('returns err for folder with no .cnj files', () => {
    const r = runMaterialisePreflight('/vfs/empty');
    expect(isErr(r)).toBe(true);
  });
});

describe('runMaterialisePreflight — single file', () => {
  it('returns ok for a folder with one .cnj file', () => {
    const r = runMaterialisePreflight('/vfs/single');
    expect(isOk(r)).toBe(true);
  });

  it('uses provided projectName', () => {
    const r = runMaterialisePreflight('/vfs/single', 'my-project');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.projectName).toBe('my-project');
  });

  it('has no unresolved refs when no :from deps', () => {
    const r = runMaterialisePreflight('/vfs/single');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.unresolvedRefs.length).toBe(0);
    expect(r.value.ready).toBe(true);
  });

  it('reports missing module paths', () => {
    const r = runMaterialisePreflight('/vfs/single');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.missingPaths.length).toBeGreaterThan(0);
  });
});

describe('runMaterialisePreflight — cross-file deps', () => {
  it('resolves a :from dependency declared in another file', () => {
    const r = runMaterialisePreflight('/vfs/multi');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.resolvedRefs.length).toBe(1);
    expect(r.value.unresolvedRefs.length).toBe(0);
    expect(r.value.ready).toBe(true);
  });

  it('resolved ref points to declared target name', () => {
    const r = runMaterialisePreflight('/vfs/multi');
    if (!isOk(r)) return;
    const ref = r.value.resolvedRefs[0];
    expect(ref?.to).toBe('shared-core');
  });
});

describe('runMaterialisePreflight — unresolved deps', () => {
  it('reports unresolved ref for missing target', () => {
    const r = runMaterialisePreflight('/vfs/missing');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.unresolvedRefs.length).toBe(1);
    expect(r.value.ready).toBe(false);
  });

  it('unresolved ref includes target name and reason', () => {
    const r = runMaterialisePreflight('/vfs/missing');
    if (!isOk(r)) return;
    const ref = r.value.unresolvedRefs[0];
    expect(ref?.target).toBe('does-not-exist');
    expect(typeof ref?.reason).toBe('string');
  });
});

describe('runMaterialisePreflight — entryFiles override', () => {
  it('uses provided entryFiles instead of scanning', () => {
    const file = '/vfs/single/project.cnj';
    const r = runMaterialisePreflight('/vfs/single', undefined, [file]);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.ready).toBe(true);
  });
});

describe('runMaterialisePreflight — :from resolves to targets and bindings (Q-14)', () => {
  it('resolves :from to a :manifest binding, a def and a keyword target reference', () => {
    const r = runMaterialisePreflight('/vfs/bindings');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.unresolvedRefs).toHaveLength(0);
    expect(r.value.resolvedRefs.map((ref) => ref.to).sort()).toEqual(['billing-rules', 'domain-lib', 'subscription-model']);
    expect(r.value.ready).toBe(true);
  });

  it('still reports a :from that names nothing declared', () => {
    const r = runMaterialisePreflight('/vfs/missing');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.unresolvedRefs.map((u) => u.target)).toEqual(['does-not-exist']);
    expect(r.value.unresolvedRefs[0]?.reason).toContain('neither a declared target nor a binding');
  });
});

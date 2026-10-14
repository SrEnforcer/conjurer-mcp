import * as vscode from 'vscode';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveSpecPath, buildIndex } from '@conjurer/core';
import type { SymbolIndex, SpecReader } from '@conjurer/core';
import { isSome, isOk, intoMap } from '@tsfpp/prelude';

export type CoreBridge = {
  readonly symbolIndex: SymbolIndex;
  readonly specReader: SpecReader;
};

const emptyIndex: SymbolIndex = { symbols: intoMap([]), grimoires: intoMap([]) };

const hasIndexFile = (specPath: string): boolean =>
  existsSync(resolve(specPath, 'index.edn'));

const tryBuildWorkspaceCandidate = (
  candidate: string,
  out: vscode.OutputChannel,
): CoreBridge | undefined => {
  out.appendLine(`[conjurer] checking ${candidate}`);
  return tryBuildFromPath(candidate, out);
};

const workspaceCandidates = (
  folders: ReadonlyArray<vscode.WorkspaceFolder>,
): ReadonlyArray<string> =>
  folders.flatMap(({ uri }) => [
    resolve(uri.fsPath, '..', 'conjurer-spec'),
    resolve(uri.fsPath, 'conjurer-spec'),
  ]);

const findWorkspaceBridge = (
  folders: ReadonlyArray<vscode.WorkspaceFolder>,
  out: vscode.OutputChannel,
): CoreBridge | undefined =>
  workspaceCandidates(folders).reduce<CoreBridge | undefined>(
    (currentBridge, candidate) => currentBridge ?? tryBuildWorkspaceCandidate(candidate, out),
    undefined,
  );

const tryBuildFromPath = (
  specPath: string,
  out: vscode.OutputChannel,
): CoreBridge | undefined => {
  if (!hasIndexFile(specPath)) return undefined;
  const reader: SpecReader = { specPath };
  const indexResult = buildIndex(reader);
  if (!isOk(indexResult)) {
    out.appendLine(`[conjurer] index build failed at ${specPath}: ${indexResult.error}`);
    return undefined;
  }
  out.appendLine(`[conjurer] spec loaded from ${specPath} — ${indexResult.value.symbols.size} symbols`);
  return { symbolIndex: indexResult.value, specReader: reader };
};

export const mkCoreBridge = (out: vscode.OutputChannel): CoreBridge => {
  // 1. Standard resolution: conjurer-spec npm package or 4-levels-up sibling.
  const pathOpt = resolveSpecPath(process.env);
  if (isSome(pathOpt)) {
    const result = tryBuildFromPath(pathOpt.value, out);
    if (result !== undefined) return result;
  } else {
    out.appendLine('[conjurer] resolveSpecPath: no path found via package resolution');
  }

  // 2. Workspace-folder fallback: look for conjurer-spec as a sibling of any open workspace root.
  const folders = vscode.workspace.workspaceFolders ?? [];
  out.appendLine(`[conjurer] trying ${folders.length} workspace folder(s) as anchors`);
  const workspaceBridge = findWorkspaceBridge(folders, out);
  if (workspaceBridge !== undefined) return workspaceBridge;

  out.appendLine('[conjurer] spec not found — hover and symbol features disabled');
  return { symbolIndex: emptyIndex, specReader: { specPath: '' } };
};

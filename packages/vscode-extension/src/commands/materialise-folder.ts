import * as vscode from 'vscode';
import { runMaterialisePreflight } from '@conjurer/core';
import type { MaterialisePreflightReport } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

export const formatPreflightReport = (report: MaterialisePreflightReport): string => {
  const lines: ReadonlyArray<string> = [
    `Project: ${report.projectName}`,
    `Ready: ${report.ready ? 'YES' : 'NO'}`,
    '',
    `Resolved refs: ${report.resolvedRefs.length}`,
    ...report.resolvedRefs.map((r) => `  ✓ ${r.from} → ${r.to}${r.outsideFolder ? ' (outside folder)' : ''}`),
    '',
    `Unresolved refs: ${report.unresolvedRefs.length}`,
    ...report.unresolvedRefs.map((u) => `  ✗ ${u.from} → ${u.target}: ${u.reason}`),
    '',
    `Missing paths: ${report.missingPaths.length}`,
    ...report.missingPaths.map((m) => `  ! ${m.path}: ${m.reason}`),
  ];
  return lines.join('\n');
};

const showPreflightResult = (
  report: MaterialisePreflightReport,
  channel: vscode.OutputChannel,
  folderPath: string,
): void => {
  channel.clear();
  channel.appendLine(`=== Conjurer Preflight: ${folderPath} ===`);
  channel.appendLine(formatPreflightReport(report));
  channel.show(true);
  if (!report.ready) {
    void vscode.window.showWarningMessage(
      `Preflight found ${report.unresolvedRefs.length} unresolved reference(s). See Output panel.`,
    );
    return;
  }
  void vscode.window.showInformationMessage('Preflight passed. Folder is ready for materialisation.');
};

const runPreflight = async (channel: vscode.OutputChannel, folderUri?: vscode.Uri): Promise<void> => {
  const targetUri = folderUri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  if (targetUri === undefined) {
    void vscode.window.showErrorMessage('No folder selected or workspace open.');
    return;
  }
  const nameInput = await vscode.window.showInputBox({
    prompt: 'Project name (leave blank for default)',
    value: 'conjurer-mcp',
  });
  const projectName = nameInput !== undefined && nameInput.trim().length > 0 ? nameInput.trim() : undefined;
  const result = runMaterialisePreflight(targetUri.fsPath, projectName);
  if (isErr(result)) {
    void vscode.window.showErrorMessage(`Preflight error: ${result.error}`);
    return;
  }
  showPreflightResult(result.value, channel, targetUri.fsPath);
};

export const registerMaterialiseFolderCommand = (ctx: vscode.ExtensionContext): void => {
  const channel = vscode.window.createOutputChannel('Conjurer Preflight');
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    channel,
    vscode.commands.registerCommand(
      'conjurer.materialiseFolder',
      (folderUri?: vscode.Uri) => void runPreflight(channel, folderUri),
    ),
  );
};

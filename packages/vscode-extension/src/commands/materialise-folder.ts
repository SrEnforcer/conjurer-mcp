import * as vscode from 'vscode';
import { runMaterialisePreflight, describePreflightError } from '@conjurer/core';
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
    `Unreadable files: ${report.unreadableFiles.length}`,
    ...report.unreadableFiles.map((u) => `  ✗ ${u.path}: ${u.reason}`),
    '',
    `Missing paths: ${report.missingPaths.length}`,
    ...report.missingPaths.map((m) => `  ! ${m.path}: ${m.reason}`),
  ];
  return lines.join('\n');
};

/** The warning shown when a preflight is not ready, naming each kind of blocker it found. */
export const notReadyMessage = (report: MaterialisePreflightReport): string => {
  const blockers = [
    report.unreadableFiles.length > 0 ? `${report.unreadableFiles.length} unreadable file(s)` : '',
    report.unresolvedRefs.length > 0 ? `${report.unresolvedRefs.length} unresolved reference(s)` : '',
  ].filter((b) => b.length > 0);
  return `Preflight found ${blockers.join(' and ')}. See Output panel.`;
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
    void vscode.window.showWarningMessage(notReadyMessage(report));
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
    void vscode.window.showErrorMessage(`Preflight error: ${describePreflightError(result.error)}`);
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

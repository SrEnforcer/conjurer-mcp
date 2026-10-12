/* eslint-disable functional/immutable-data -- DEVIATION(2.3): status bar item properties are mutated in place; VS Code StatusBarItem has no immutable update API. */
import * as vscode from 'vscode';
import { buildWorkspaceSnapshot, computeForesightHealth, todayISO } from '@conjurer/core';
import type { WorkspaceSnapshot, CnjCandidateForm, CnjHoist } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

export type HealthIssueKind = 'stale' | 'thin_rationale' | 'orphaned_hoist' | 'high_score_no_conditions';

export type HealthIssue = {
  readonly kind: HealthIssueKind;
  readonly id: string;
  readonly label: string;
  readonly detail: string;
};

const HEALTH_THRESHOLDS = { staleDays: 30, minRationaleLength: 20, highScoreThreshold: 30 } as const;

/**
 * Flatten the shared foresight health check into status-bar issues.
 *
 * @param snapshot - Workspace snapshot to check.
 * @param today - Reference date `YYYY-MM-DD`; defaults to the current date.
 * @returns One issue per diagnostic, in the order stale, thin, orphaned, high-score.
 */
export const computeHealthIssues = (snapshot: WorkspaceSnapshot, today: string = todayISO()): ReadonlyArray<HealthIssue> => {
  const entries = Array.from(snapshot.files.values());
  const candidates: ReadonlyArray<CnjCandidateForm> = entries.flatMap((e) => e.doc.candidates);
  const hoists: ReadonlyArray<CnjHoist> = entries.flatMap((e) => e.doc.hoists);
  const report = computeForesightHealth(candidates, hoists, { ...HEALTH_THRESHOLDS, today });
  return [
    ...report.stale_candidates.map((s) => ({ kind: 'stale' as const, id: s.id, label: s.label, detail: `${s.days_since_added}d old, no reassessment` })),
    ...report.thin_rationale.map((s) => ({ kind: 'thin_rationale' as const, id: s.id, label: s.label, detail: `rationale ${s.rationale_length} chars < ${HEALTH_THRESHOLDS.minRationaleLength}` })),
    ...report.orphaned_hoists.map((s) => ({ kind: 'orphaned_hoist' as const, id: s.of, label: `hoist for ${s.of}`, detail: 'no matching f/candidate' })),
    ...report.high_score_no_conditions.map((s) => ({ kind: 'high_score_no_conditions' as const, id: s.id, label: s.label, detail: `score ${s.total_score}, no conditions` })),
  ];
};

export const registerForesightStatusBar = (ctx: vscode.ExtensionContext): void => {
  // DEVIATION(1.9): vscode.StatusBarItem is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.command = 'conjurer.showForesightHealth';

  const refresh = (document: vscode.TextDocument | undefined): void => {
    if (document === undefined || !document.fileName.endsWith('.cnj')) {
      item.hide();
      return;
    }
    const snapshotRes = buildWorkspaceSnapshot(document.fileName);
    const issues = isErr(snapshotRes) ? [] : computeHealthIssues(snapshotRes.value);
    if (issues.length === 0) {
      item.text = '$(check) Conjurer';
      item.tooltip = 'Foresight backlog healthy';
      item.backgroundColor = undefined;
    } else {
      item.text = `$(warning) ${issues.length} foresight issue${issues.length === 1 ? '' : 's'}`;
      item.tooltip = issues.map((i) => `${i.kind}: ${i.label}`).join('\n');
      // eslint-disable-next-line no-restricted-syntax
      item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    item.show();
  };

  ctx.subscriptions.push(
    item,
    vscode.window.onDidChangeActiveTextEditor((editor) => refresh(editor?.document)),
    vscode.commands.registerCommand('conjurer.showForesightHealth', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc === undefined || !doc.fileName.endsWith('.cnj')) return;
      const snapshotRes = buildWorkspaceSnapshot(doc.fileName);
      const issues = isErr(snapshotRes) ? [] : computeHealthIssues(snapshotRes.value);
      if (issues.length === 0) {
        void vscode.window.showInformationMessage('Foresight backlog is healthy — no issues found.');
        return;
      }
      const items = issues.map((issue) => ({
        label: `$(warning) ${issue.label}`,
        description: issue.detail,
        detail: issue.kind,
      }));
      void vscode.window.showQuickPick(items, {
        title: `Foresight Health (${issues.length} issue${issues.length === 1 ? '' : 's'})`,
        canPickMany: false,
      });
    }),
  );

  refresh(vscode.window.activeTextEditor?.document);
};

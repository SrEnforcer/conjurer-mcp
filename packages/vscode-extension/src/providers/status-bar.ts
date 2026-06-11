/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations. */
/* eslint-disable functional/immutable-data -- DEVIATION(2.3): status bar item properties are mutated in place; VS Code StatusBarItem has no immutable update API. */
import * as vscode from 'vscode';
import { buildWorkspaceSnapshot } from '@conjurer/core';
import type { WorkspaceSnapshot, CnjCandidateForm, CnjHoist } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

export type HealthIssueKind = 'stale' | 'thin_rationale' | 'orphaned_hoist' | 'high_score_no_conditions';

export type HealthIssue = {
  readonly kind: HealthIssueKind;
  readonly id: string;
  readonly label: string;
  readonly detail: string;
};

const ACTIVE_STATUSES = new Set(['proposed', 'planned']);
const STALE_DAYS = 30;
const MIN_RATIONALE_LENGTH = 20;
const HIGH_SCORE_THRESHOLD = 30;

const totalScore = (c: CnjCandidateForm): number =>
  Array.from(c.scores.values()).reduce((a, b) => a + b, 0);

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number => {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
};

export const computeHealthIssues = (snapshot: WorkspaceSnapshot): ReadonlyArray<HealthIssue> => {
  const today = todayISO();
  const allCandidates: ReadonlyArray<CnjCandidateForm> = Array.from(snapshot.files.values())
    .flatMap((e) => e.doc.candidates);
  const allHoists: ReadonlyArray<CnjHoist> = Array.from(snapshot.files.values())
    .flatMap((e) => e.doc.hoists);
  const activeCandidates = allCandidates.filter((c) => ACTIVE_STATUSES.has(c.status));
  // eslint-disable-next-line no-restricted-syntax
  const candidateIds = new Set(allCandidates.map((c) => c.id));

  const stale: ReadonlyArray<HealthIssue> = activeCandidates
    .filter((c) => c.history.length === 0 && daysBetween(c.added, today) > STALE_DAYS)
    .map((c) => ({
      kind: 'stale' as const,
      id: c.id,
      label: c.label,
      detail: `${daysBetween(c.added, today)}d old, no reassessment`,
    }));

  const thin: ReadonlyArray<HealthIssue> = activeCandidates
    .filter((c) => c.rationale.length < MIN_RATIONALE_LENGTH)
    .map((c) => ({
      kind: 'thin_rationale' as const,
      id: c.id,
      label: c.label,
      detail: `rationale ${c.rationale.length} chars < ${MIN_RATIONALE_LENGTH}`,
    }));

  const orphans: ReadonlyArray<HealthIssue> = allHoists
    .filter((h) => !candidateIds.has(h.of))
    .map((h) => ({
      kind: 'orphaned_hoist' as const,
      id: h.of,
      label: `hoist for ${h.of}`,
      detail: 'no matching f/candidate',
    }));

  const highScore: ReadonlyArray<HealthIssue> = activeCandidates
    .filter((c) => totalScore(c) >= HIGH_SCORE_THRESHOLD && c.conditions.length === 0)
    .map((c) => ({
      kind: 'high_score_no_conditions' as const,
      id: c.id,
      label: c.label,
      detail: `score ${totalScore(c)}, no conditions`,
    }));

  return [...stale, ...thin, ...orphans, ...highScore];
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

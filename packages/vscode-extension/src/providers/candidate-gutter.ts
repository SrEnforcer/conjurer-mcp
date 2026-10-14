/* eslint-disable functional/immutable-data -- DEVIATION(2.3): decoration type map uses mutable object initialisation. */
import * as vscode from 'vscode';
import { parse, toCnjModel } from '@conjurer/core';
import type { CnjCandidateForm } from '@conjurer/core';
import { isErr, intoMap } from '@tsfpp/prelude';

type StatusKey = 'proposed' | 'planned' | 'hoisted' | 'abandoned' | 'rejected';

const STATUS_KEYS: ReadonlyArray<StatusKey> = ['proposed', 'planned', 'hoisted', 'abandoned', 'rejected'];

const STATUS_COLORS: Record<StatusKey, string> = {
  proposed:  '%23f97316',  // orange (URL-encoded #)
  planned:   '%233b82f6',  // blue
  hoisted:   '%2322c55e',  // green
  abandoned: '%239ca3af',  // gray
  rejected:  '%23ef4444',  // red
};

const makeGutterIcon = (color: string): vscode.Uri =>
  vscode.Uri.parse(
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='5' fill='${color}'/%3E%3C/svg%3E`,
  );

const mkDecorationTypes = (): Record<StatusKey, vscode.TextEditorDecorationType> => ({
  proposed:  vscode.window.createTextEditorDecorationType({ gutterIconPath: makeGutterIcon(STATUS_COLORS.proposed),  gutterIconSize: 'contain' }),
  planned:   vscode.window.createTextEditorDecorationType({ gutterIconPath: makeGutterIcon(STATUS_COLORS.planned),   gutterIconSize: 'contain' }),
  hoisted:   vscode.window.createTextEditorDecorationType({ gutterIconPath: makeGutterIcon(STATUS_COLORS.hoisted),   gutterIconSize: 'contain' }),
  abandoned: vscode.window.createTextEditorDecorationType({ gutterIconPath: makeGutterIcon(STATUS_COLORS.abandoned), gutterIconSize: 'contain' }),
  rejected:  vscode.window.createTextEditorDecorationType({ gutterIconPath: makeGutterIcon(STATUS_COLORS.rejected),  gutterIconSize: 'contain' }),
});

const CANDIDATE_RE = /^\(f\/candidate\s+:([a-zA-Z][a-zA-Z0-9_-]*)/;

type CandidateLineMap = ReadonlyMap<string, number>;

const findCandidateLines = (document: vscode.TextDocument): CandidateLineMap =>
  intoMap(
    Array.from({ length: document.lineCount }, (_, line) => ({
      line,
      text: document.lineAt(line).text,
    })).flatMap(({ line, text }) => {
      const match = CANDIDATE_RE.exec(text);
      return match !== null && (match[1]?.length ?? 0) > 0
        ? [[match[1] ?? '', line] as const]
        : [];
    }),
  );

const candidateStatuses = (
  candidates: ReadonlyArray<CnjCandidateForm>,
): ReadonlyMap<string, CnjCandidateForm['status']> =>
  intoMap(candidates.map((candidate) => [candidate.id, candidate.status]));

const makeRange = (line: number): vscode.Range => {
  // DEVIATION(1.9): vscode.Range is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.Range(line, 0, line, 0);
};

const rangesForStatus = (
  lineMap: CandidateLineMap,
  statuses: ReadonlyMap<string, CnjCandidateForm['status']>,
  status: StatusKey,
): ReadonlyArray<vscode.Range> =>
  Array.from(lineMap.entries())
    .filter(([id]) => statuses.get(id) === status)
    .map(([, line]) => makeRange(line));

const clearDecorations = (
  editor: vscode.TextEditor,
  types: Record<StatusKey, vscode.TextEditorDecorationType>,
): void => {
  Object.values(types).forEach((type) => editor.setDecorations(type, []));
};

const applyDecorations = (
  editor: vscode.TextEditor,
  types: Record<StatusKey, vscode.TextEditorDecorationType>,
): void => {
  if (!editor.document.fileName.endsWith('.cnj')) {
    clearDecorations(editor, types);
    return;
  }
  const lineMap = findCandidateLines(editor.document);
  if (lineMap.size === 0) {
    clearDecorations(editor, types);
    return;
  }
  const parsed = parse(editor.document.getText());
  if (isErr(parsed)) return;
  const docResult = toCnjModel(parsed.value, editor.document.fileName);
  if (isErr(docResult)) return;

  const statuses = candidateStatuses(docResult.value.candidates);

  STATUS_KEYS.forEach((status) => {
    editor.setDecorations(types[status], rangesForStatus(lineMap, statuses, status));
  });
};

export const registerCandidateGutter = (ctx: vscode.ExtensionContext): void => {
  const types = mkDecorationTypes();

  const refresh = (editor: vscode.TextEditor | undefined): void => {
    if (editor !== undefined) applyDecorations(editor, types);
  };

  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  ctx.subscriptions.push(
    ...Object.values(types),
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document === doc) applyDecorations(editor, types);
    }),
  );

  refresh(vscode.window.activeTextEditor);
};

import * as vscode from 'vscode';

const HOIST_START_RE = /^\(f\/hoist\b/;
const CANDIDATE_START_RE = /^\(f\/candidate\b/;
const STATUS_HOISTED_RE = /:status\s+:hoisted\b/;
const TOP_FORM_RE = /^\([a-zA-Z]/;

export type FoldRange = { readonly start: number; readonly end: number };

/**
 * Pure: compute fold ranges for forms that should be collapsed by default.
 * Folds: (f/hoist ...) forms and (f/candidate ...) forms with :status :hoisted.
 * Returns plain {start, end} pairs so callers can test without vscode types.
 */
export const computeHoistFoldRanges = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<FoldRange> => {
  // Collect the start line of every top-level form (lines matching /^\([a-zA-Z]/).
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (TOP_FORM_RE.test(lines[i] ?? '')) starts.push(i);
  }

  const ranges: FoldRange[] = [];
  for (let b = 0; b < starts.length; b++) {
    const start = starts[b] ?? 0;
    // Each form spans from its start line to one line before the next form (or EOF).
    const end = (starts[b + 1] ?? lines.length) - 1;
    const first = lines[start] ?? '';

    if (HOIST_START_RE.test(first)) {
      ranges.push({ start, end });
    } else if (CANDIDATE_START_RE.test(first)) {
      const body = lines.slice(start, end + 1).join('\n');
      if (STATUS_HOISTED_RE.test(body)) {
        ranges.push({ start, end });
      }
    }
  }
  return ranges;
};

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

export type ConjurerFoldingProvider = vscode.FoldingRangeProvider;

export const createFoldingProvider = (): ConjurerFoldingProvider => ({
  // DEVIATION(1.9): vscode.FoldingRangeProvider.provideFoldingRanges must return a mutable FoldingRange[].
  // eslint-disable-next-line functional/prefer-readonly-type
  provideFoldingRanges: (
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken,
  ): vscode.FoldingRange[] =>
    document.fileName.endsWith('.cnj')
      ? computeHoistFoldRanges(getLines(document)).map(
          // eslint-disable-next-line no-restricted-syntax
          ({ start, end }) => new vscode.FoldingRange(start, end),
        )
      : [],
});

/**
 * Programmatically collapse all hoisted forms in the active editor on first open.
 * Does nothing for non-.cnj files or files with no hoisted forms.
 * The 300ms defer lets VS Code finish building its fold model before we issue the
 * fold command — calling editor.fold before the model is ready silently no-ops.
 */
export const foldHoistFormsOnOpen = (editor: vscode.TextEditor): void => {
  if (!editor.document.fileName.endsWith('.cnj')) return;
  const selectionLines = computeHoistFoldRanges(getLines(editor.document)).map((r) => r.start);
  if (selectionLines.length === 0) return;
  setTimeout(() => {
    void vscode.commands.executeCommand('editor.fold', { selectionLines });
  }, 300);
};

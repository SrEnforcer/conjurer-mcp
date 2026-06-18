import * as vscode from 'vscode';

const HOIST_START_RE = /^\(f\/hoist\b/;
const CANDIDATE_START_RE = /^\(f\/candidate\b/;
const STATUS_HOISTED_RE = /:status\s+:hoisted\b/;
const TOP_FORM_RE = /^\([a-zA-Z]/;
const DECISIONS_START_RE = /^\s*:decisions\s*\[/;

export type FoldRange = { readonly start: number; readonly end: number };

const topFormStarts = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  lines.flatMap((line, index) => (TOP_FORM_RE.test(line) ? [index] : []));

const foldRangeFromStart = (
  lines: ReadonlyArray<string>,
  starts: ReadonlyArray<number>,
  index: number,
): FoldRange => ({
  start: starts[index] ?? 0,
  end: (starts[index + 1] ?? lines.length) - 1,
});

const shouldFoldRange = (lines: ReadonlyArray<string>, range: FoldRange): boolean => {
  const firstLine = lines[range.start] ?? '';
  if (HOIST_START_RE.test(firstLine)) return true;
  if (!CANDIDATE_START_RE.test(firstLine)) return false;
  const body = lines.slice(range.start, range.end + 1).join('\n');
  return STATUS_HOISTED_RE.test(body);
};

const countBracketDelta = (line: string): number =>
  [...line].reduce(
    (depth, ch) => depth + (ch === '[' ? 1 : ch === ']' ? -1 : 0),
    0,
  );

const findDecisionEnd = (
  lines: ReadonlyArray<string>,
  index: number,
  depth: number,
): number | undefined => {
  const currentLine = lines[index];
  if (currentLine === undefined) return undefined;
  const nextDepth = depth + countBracketDelta(currentLine);
  return nextDepth === 0 ? index : findDecisionEnd(lines, index + 1, nextDepth);
};

const decisionStarts = (lines: ReadonlyArray<string>): ReadonlyArray<number> =>
  lines.flatMap((line, index) => (DECISIONS_START_RE.test(line) ? [index] : []));

/**
 * Pure: compute fold ranges for forms that should be collapsed by default.
 * Folds: (f/hoist ...) forms and (f/candidate ...) forms with :status :hoisted.
 * Returns plain {start, end} pairs so callers can test without vscode types.
 */
export const computeHoistFoldRanges = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<FoldRange> =>
  topFormStarts(lines)
    .map((_, index, starts) => foldRangeFromStart(lines, starts, index))
    .filter((range) => shouldFoldRange(lines, range));

/**
 * Pure: compute fold ranges for :decisions [...] blocks.
 * Uses bracket-counting so nested vectors inside decision maps are handled correctly.
 */
export const computeDecisionFoldRanges = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<FoldRange> =>
  decisionStarts(lines).flatMap((start) => {
    const end = findDecisionEnd(lines, start, 0);
    return end === undefined ? [] : [{ start, end }];
  });

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

export type ConjurerFoldingProvider = vscode.FoldingRangeProvider;

export const createFoldingProvider = (): ConjurerFoldingProvider => ({
  provideFoldingRanges: (
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken,
  ) =>
    document.fileName.endsWith('.cnj')
      ? [
          ...computeHoistFoldRanges(getLines(document)),
          ...computeDecisionFoldRanges(getLines(document)),
        ].map(
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
  const lines = getLines(editor.document);
  const selectionLines: ReadonlyArray<number> = [
    ...computeHoistFoldRanges(lines),
    ...computeDecisionFoldRanges(lines),
  ].map((r) => r.start);
  if (selectionLines.length === 0) return;
  setTimeout(() => {
    void vscode.commands.executeCommand('editor.fold', { selectionLines });
  }, 300);
};

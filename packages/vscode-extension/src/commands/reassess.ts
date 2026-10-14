import * as vscode from 'vscode';
import { some, none, isSome, matchOption } from '@tsfpp/prelude';
import type { Option } from '@tsfpp/prelude';
import { historyInsertion } from './history-insert.js';

const SCORE_DIMS = ['feasibility', 'elegance', 'containment', 'value'] as const;
type ScoreDim = typeof SCORE_DIMS[number];

// DEVIATION(4.6): the clock is read at the adapter boundary to date inserted history records.
// eslint-disable-next-line no-restricted-syntax
const TODAY = (): string => new Date().toISOString().slice(0, 10);

const TOP_FORM = /^\([a-zA-Z]/;

const lineParenDelta = (line: string): number =>
  [...line].reduce(
    (depth, ch) => depth + (ch === '(' ? 1 : ch === ')' ? -1 : 0),
    0,
  );

type FormScanState = {
  readonly depth: number;
  readonly index: number;
};

const findFormEndLineFrom = (
  lines: ReadonlyArray<string>,
  startLine: number,
  state: FormScanState,
): number => {
  const currentLine = lines[state.index];
  if (currentLine === undefined) return lines.length - 1;
  if (state.index !== startLine && state.depth === 0 && TOP_FORM.test(currentLine)) return state.index - 1;
  const nextDepth = state.depth + lineParenDelta(currentLine);
  if (nextDepth <= 0 && state.index > startLine) return state.index;
  return findFormEndLineFrom(lines, startLine, { depth: nextDepth, index: state.index + 1 });
};

/**
 * Find the line index of the closing paren of the top-level form starting at startLine.
 * Uses a simple paren-balance walk, stopping at the next top-level form or EOF.
 */
export const findFormEndLine = (lines: ReadonlyArray<string>, startLine: number): number => {
  return findFormEndLineFrom(lines, startLine, { depth: 0, index: startLine });
};

type ReassessInput = {
  readonly id: string;
  readonly before: Readonly<Record<ScoreDim, number>>;
  readonly after: Readonly<Record<ScoreDim, number>>;
  readonly rationale: string;
  readonly today: string;
};

/**
 * Lines of one f/reassess form, unindented; placed into the candidate's :history.
 * Per foresight.md, :scores carries only the dimensions that changed and is omitted when none did.
 */
export const buildReassessEntry = ({ id, before, after, rationale, today }: ReassessInput): ReadonlyArray<string> => {
  const changed = SCORE_DIMS.filter((d) => after[d] !== before[d]);
  const scoresLine = changed.length === 0
    ? []
    : [`  :scores    {${changed.map((d) => `:${d} ${after[d]}`).join(' ')}}`];
  return [
    `(f/reassess :of :${id}`,
    `  :date      "${today}"`,
    ...scoresLine,
    `  :rationale "${rationale.replace(/"/g, '\\"')}")`,
  ];
};

const buildHoistBlock = (id: string, into: string, note: string): string =>
  [
    ``,
    `(f/hoist :of :${id}`,
    `  :date     "${TODAY()}"`,
    `  :into     :charter-decision/${into}-${TODAY()}`,
    `  :outcomes []`,
    `  :note     "${note.replace(/"/g, '\\"')}")`,
  ].join('\n');

/** Parses input-box text into a whole score from 1 to 10; none for anything else. */
const mkScore = (raw: string): Option<number> => {
  const text = raw.trim();
  if (!/^\d{1,2}$/.test(text)) return none;
  const n = Number(text);
  return n >= 1 && n <= 10 ? some(n) : none;
};

const askScore = async (dim: ScoreDim, current: number): Promise<number | undefined> => {
  const raw = await vscode.window.showInputBox({
    prompt: `Score for ${dim} (1–10, current: ${current})`,
    value: String(current),
    validateInput: (v) => (isSome(mkScore(v)) ? undefined : 'Enter a number 1–10'),
  });
  if (raw === undefined) return undefined;
  const score = mkScore(raw);
  return matchOption((): number | undefined => undefined, (n: number): number | undefined => n)(score);
};

const collectScores = async (
  dims: ReadonlyArray<ScoreDim>,
  currentScores: Readonly<Record<ScoreDim, number>>,
  acc: Readonly<Record<ScoreDim, number>>,
): Promise<Readonly<Record<ScoreDim, number>> | undefined> => {
  const [dim, ...remainingDims] = dims;
  if (dim === undefined) return acc;
  const score = await askScore(dim, currentScores[dim]);
  if (score === undefined) return undefined;
  return collectScores(remainingDims, currentScores, { ...acc, [dim]: score });
};

const makeInsertPosition = (line: number, character = 0): vscode.Position => {
  // DEVIATION(1.9): vscode.Position is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.Position(line, character);
};

const makeWorkspaceEdit = (): vscode.WorkspaceEdit => {
  // DEVIATION(1.9): vscode.WorkspaceEdit is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.WorkspaceEdit();
};

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

const doReassessCandidate = async (
  id: string,
  startLine: number,
  currentScores: Readonly<Record<ScoreDim, number>>,
): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;

  const scores = await collectScores(SCORE_DIMS, currentScores, currentScores);
  if (scores === undefined) return;
  const rationale = await vscode.window.showInputBox({
    prompt: 'Reassessment rationale (what changed, why scores moved)',
    placeHolder: 'e.g. workspace-snapshot layer confirmed stable; feasibility raised to 8',
  });
  if (rationale === undefined) return;

  const lines = getLines(editor.document);
  const endLine = findFormEndLine(lines, startLine);
  const entry = buildReassessEntry({ id, before: currentScores, after: scores, rationale, today: TODAY() });
  const insertion = historyInsertion(lines, { startLine, endLine }, entry);
  if (insertion === undefined) {
    void vscode.window.showErrorMessage(`Could not place f/reassess in the :history of :${id}.`);
    return;
  }

  const edit = makeWorkspaceEdit();
  edit.insert(editor.document.uri, makeInsertPosition(insertion.line, insertion.character), insertion.text);
  await vscode.workspace.applyEdit(edit);
};

const doHoistCandidate = async (id: string, startLine: number): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;

  const intoKey = await vscode.window.showInputBox({
    prompt: `Decision key (will become :charter-decision/${id}-${TODAY()})`,
    value: id,
  });
  if (intoKey === undefined) return;
  const note = await vscode.window.showInputBox({
    prompt: 'Hoist note — what was decided / what conditions were met',
    placeHolder: 'e.g. All conditions met; implemented in providers/foo.ts',
  });
  if (note === undefined) return;

  const lines = getLines(editor.document);
  const endLine = findFormEndLine(lines, startLine);
  const insertPos = makeInsertPosition(endLine + 1);
  const block = buildHoistBlock(id, intoKey, note);

  const edit = makeWorkspaceEdit();
  edit.insert(editor.document.uri, insertPos, block + '\n');
  await vscode.workspace.applyEdit(edit);
};

export const registerReassessCommands = (ctx: vscode.ExtensionContext): void => {
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      'conjurer.reassessCandidate',
      (id: string, startLine: number, scores: Record<ScoreDim, number>) =>
        void doReassessCandidate(id, startLine, scores),
    ),
    vscode.commands.registerCommand(
      'conjurer.hoistCandidate',
      (id: string, startLine: number) => void doHoistCandidate(id, startLine),
    ),
  );
};

/**
 * Placement of an f/reassess record inside a candidate's :history vector.
 * Pure: works over the document's lines and returns the text edit to apply.
 */

/** A single text insertion at a zero-based line and character. */
export type TextInsertion = {
  readonly line: number;
  readonly character: number;
  readonly text: string;
};

type Pos = { readonly line: number; readonly character: number };

/** Zero-based, inclusive line span of one top-level form. */
export type FormSpan = { readonly startLine: number; readonly endLine: number };

type ScanState = {
  readonly depth: number;
  readonly inString: boolean;
  readonly escaped: boolean;
  readonly comment: boolean;
  readonly found: number | undefined;
};

const OPENERS = '([{';
const CLOSERS = ')]}';

const stepInString = (s: ScanState, ch: string): ScanState => {
  if (s.escaped) return { ...s, escaped: false };
  return ch === '\\' ? { ...s, escaped: true } : { ...s, inString: ch !== '"' };
};

const stepChar = (s: ScanState, ch: string, character: number): ScanState => {
  if (s.found !== undefined || s.comment) return s;
  if (s.inString) return stepInString(s, ch);
  if (ch === '"') return { ...s, inString: true };
  if (ch === ';') return { ...s, comment: true };
  if (OPENERS.includes(ch)) return { ...s, depth: s.depth + 1 };
  if (!CLOSERS.includes(ch)) return s;
  return s.depth === 1 ? { ...s, found: character } : { ...s, depth: s.depth - 1 };
};

const scanLines = (lines: ReadonlyArray<string>, from: Pos, s: ScanState): Pos | undefined => {
  const text = lines[from.line];
  if (text === undefined) return undefined;
  // UTF-16 units, to match VS Code positions.
  const after = text.slice(from.character).split('').reduce(
    (acc, ch, i) => stepChar(acc, ch, from.character + i),
    { ...s, comment: false },
  );
  if (after.found !== undefined) return { line: from.line, character: after.found };
  return scanLines(lines, { line: from.line + 1, character: 0 }, after);
};

/** Position of the bracket closing the one opened at `open`, skipping strings and comments. */
export const findMatchingClose = (lines: ReadonlyArray<string>, open: Pos): Pos | undefined =>
  scanLines(lines, open, { depth: 0, inString: false, escaped: false, comment: false, found: undefined });

const findKeyLine = (lines: ReadonlyArray<string>, form: FormSpan, key: RegExp): number | undefined => {
  const offset = lines.slice(form.startLine, form.endLine + 1).findIndex((l) => key.test(l));
  return offset < 0 ? undefined : form.startLine + offset;
};

const indentLines = (entry: ReadonlyArray<string>, indent: string): ReadonlyArray<string> =>
  entry.map((l, i) => (i === 0 ? l : `${indent}${l}`));

const appendToHistory = (
  lines: ReadonlyArray<string>,
  historyLine: number,
  entry: ReadonlyArray<string>,
): TextInsertion | undefined => {
  const open = (lines[historyLine] ?? '').indexOf('[');
  const close = findMatchingClose(lines, { line: historyLine, character: open });
  if (close === undefined) return undefined;
  const indent = ' '.repeat(open + 1);
  return {
    line: close.line,
    character: close.character,
    text: `\n${indent}${indentLines(entry, indent).join('\n')}`,
  };
};

const newHistoryAfter = (
  lines: ReadonlyArray<string>,
  anchorLine: number,
  entry: ReadonlyArray<string>,
): TextInsertion => {
  const anchor = lines[anchorLine] ?? '';
  const brace = anchor.indexOf('{');
  const mapEnd = brace < 0 ? undefined : findMatchingClose(lines, { line: anchorLine, character: brace });
  const keyIndent = anchor.startsWith('(') ? '  ' : /^\s*/.exec(anchor)?.[0] ?? '  ';
  const head = `${keyIndent}:history [`;
  return {
    line: (mapEnd?.line ?? anchorLine) + 1,
    character: 0,
    text: `${head}${indentLines(entry, ' '.repeat(head.length)).join('\n')}]\n`,
  };
};

/**
 * Where and what to insert so `entry` (the lines of one f/reassess form) becomes the last
 * entry of the :history vector of the form spanning `form`. Creates :history after
 * :scores when absent, or after the form's head line when :scores is absent too.
 */
export const historyInsertion = (
  lines: ReadonlyArray<string>,
  form: FormSpan,
  entry: ReadonlyArray<string>,
): TextInsertion | undefined => {
  const historyLine = findKeyLine(lines, form, /^\s*:history\s*\[/);
  if (historyLine !== undefined) return appendToHistory(lines, historyLine, entry);
  const scoresLine = findKeyLine(lines, form, /^\s*:scores\s/);
  const insertion = newHistoryAfter(lines, scoresLine ?? form.startLine, entry);
  // A new line inserted past the form's last line would land outside the form.
  return insertion.line > form.endLine ? undefined : insertion;
};

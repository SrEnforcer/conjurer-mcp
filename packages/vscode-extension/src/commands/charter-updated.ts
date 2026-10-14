/**
 * Keeps a charter's :updated current when a command writes a dated entry into the file.
 * Pure: works over the document's lines and returns the text edit to apply.
 */

/** Replace `length` characters at a zero-based line and character with `text`. */
export type TextReplacement = {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly text: string;
};

const CHARTER_START_RE = /^\(charter\b/;
const TOP_FORM_RE = /^\([a-zA-Z]/;
const UPDATED_RE = /^(\s*:updated\s+")(\d{4}-\d{2}-\d{2})"/;

const charterSpan = (lines: ReadonlyArray<string>): ReadonlyArray<number> => {
  const start = lines.findIndex((l) => CHARTER_START_RE.test(l));
  if (start < 0) return [];
  const next = lines.findIndex((l, i) => i > start && TOP_FORM_RE.test(l));
  return Array.from({ length: (next < 0 ? lines.length : next) - start }, (_, i) => start + i);
};

/**
 * The edit that moves the charter's `:updated` date forward to `today`, or undefined when
 * the file has no charter, the charter has no `:updated` date, or it is already `today` or later.
 * Only the date is replaced; anything after it on the line is kept.
 */
export const charterUpdatedBump = (lines: ReadonlyArray<string>, today: string): TextReplacement | undefined => {
  const line = charterSpan(lines).find((i) => UPDATED_RE.test(lines[i] ?? ''));
  if (line === undefined) return undefined;
  const match = UPDATED_RE.exec(lines[line] ?? '');
  const [, prefix = '', date = ''] = match ?? [];
  return date >= today ? undefined : { line, character: prefix.length, length: date.length, text: today };
};

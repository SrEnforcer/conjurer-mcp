import { ok, err, isErr, intoMap, isFiniteNumber } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';
import { scan, unfold } from './iteration.js';
import type { Step, Unfolded } from './iteration.js';

export type TokenType =
  | 'lparen' | 'rparen'
  | 'lbracket' | 'rbracket'
  | 'lbrace' | 'rbrace' | 'lset'
  | 'symbol' | 'keyword' | 'string' | 'number' | 'boolean' | 'nil' | 'eof';

export type Token = {
  readonly type: TokenType;
  readonly value: string;
  readonly line: number;
  readonly column: number;
};

export type ParseError = {
  readonly kind: 'ParseError';
  readonly message: string;
  readonly line: number;
  readonly column: number;
};

export type EdnList = {
  readonly type: 'list';
  readonly elements: ReadonlyArray<EdnNode>;
  /** How the sequence was written: absent for `( )`, `vector` for `[ ]`, `set` for `#{ }`. */
  readonly delimiter?: 'vector' | 'set';
  readonly line: number;
  readonly column: number;
};

export type EdnMap = {
  readonly type: 'map';
  readonly entries: ReadonlyMap<string, EdnNode>;
  readonly line: number;
  readonly column: number;
};

export type EdnKeyword = { readonly type: 'keyword'; readonly value: string; readonly line: number; readonly column: number };
export type EdnSymbol  = { readonly type: 'symbol';  readonly value: string; readonly line: number; readonly column: number };
export type EdnString  = { readonly type: 'string';  readonly value: string; readonly line: number; readonly column: number };
export type EdnNumber  = { readonly type: 'number';  readonly value: number; readonly line: number; readonly column: number };
export type EdnBoolean = { readonly type: 'boolean'; readonly value: boolean; readonly line: number; readonly column: number };
export type EdnNil     = { readonly type: 'nil'; readonly line: number; readonly column: number };

export type EdnNode = EdnList | EdnMap | EdnKeyword | EdnSymbol | EdnString | EdnNumber | EdnBoolean | EdnNil;

// ── Lexer ─────────────────────────────────────────────────────────────────────
//
// One pass over the input: each token's extent is found by a `scan` loop over indices, so
// stack depth stays constant however long a string, comment or whitespace run is. A token's
// value is always its verbatim source text.

type Pos = { readonly offset: number; readonly line: number; readonly column: number };

const mkErr = (message: string, line: number, column: number): ParseError => ({ kind: 'ParseError', message, line, column });

/** The position at `to`, counting a line per `\n` in the text passed over. */
const advanceTo = (input: string, pos: Pos, to: number): Pos => {
  const passed = input.slice(pos.offset, to);
  const lastNl = passed.lastIndexOf('\n');
  if (lastNl < 0) return { offset: to, line: pos.line, column: pos.column + passed.length };
  return { offset: to, line: pos.line + passed.split('\n').length - 1, column: passed.length - lastNl };
};

const isWS = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';
const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isSymS = (c: string): boolean => /^[a-zA-Z_\-+*/?!<>='~&]$/.test(c);
const isSymC = (c: string): boolean => isSymS(c) || c === '.' || isDigit(c);

/** End of the run of characters from `from` that satisfy `pred`. */
const runEnd = (input: string, from: number, pred: (c: string) => boolean): number =>
  scan(from, (i) => {
    const c = input[i];
    return c !== undefined && pred(c) ? i + 1 : undefined;
  });

/** End of the whitespace and `;` comments from `from`. */
const gapEnd = (input: string, from: number): number =>
  scan(from, (i) => {
    const c = input[i];
    if (c === undefined) return undefined;
    if (isWS(c)) return i + 1;
    if (c !== ';') return undefined;
    const nl = input.indexOf('\n', i);
    return nl < 0 ? input.length : nl;
  });

/** Index just past the closing quote of the string opened at `from`, or undefined when it never closes. */
const stringEnd = (input: string, from: number): number | undefined => {
  const close = scan(from + 1, (i) => {
    const c = input[i];
    if (c === undefined || c === '"') return undefined;
    return c === '\\' ? Math.min(i + 2, input.length) : i + 1;
  });
  return input[close] === '"' ? close + 1 : undefined;
};

/** `-?digits` with an optional `/digits` or `.digits`. */
const numberEnd = (input: string, from: number): number => {
  const whole = runEnd(input, input[from] === '-' ? from + 1 : from, isDigit);
  const sep = input[whole];
  return (sep === '/' || sep === '.') && isDigit(input[whole + 1] ?? '') ? runEnd(input, whole + 1, isDigit) : whole;
};

const isNumStart = (input: string, at: number): boolean => {
  const c = input[at] ?? '';
  return isDigit(c) || (c === '-' && isDigit(input[at + 1] ?? ''));
};

const BRACKETS: Record<string, TokenType> = {
  '(': 'lparen', ')': 'rparen', '[': 'lbracket', ']': 'rbracket', '{': 'lbrace', '}': 'rbrace',
};

const tokenAt = (type: TokenType, pos: Pos, value: string): Token => ({ type, value, line: pos.line, column: pos.column });

const symbolType = (value: string): TokenType =>
  value === 'true' || value === 'false' ? 'boolean' : value === 'nil' ? 'nil' : 'symbol';

/** A keyword, string, number or symbol at `pos`. */
const lexAtom = (input: string, pos: Pos): Result<Token, ParseError> => {
  const at = pos.offset;
  const c = input[at] ?? '\0';
  if (c === ':') return ok(tokenAt('keyword', pos, input.slice(at, runEnd(input, at + 1, isSymC))));
  if (c === '"') {
    const end = stringEnd(input, at);
    return end === undefined ? err(mkErr('Unterminated string', pos.line, pos.column)) : ok(tokenAt('string', pos, input.slice(at, end)));
  }
  if (isNumStart(input, at)) return ok(tokenAt('number', pos, input.slice(at, numberEnd(input, at))));
  if (isSymS(c)) {
    const value = input.slice(at, runEnd(input, at, isSymC));
    return ok(tokenAt(symbolType(value), pos, value));
  }
  return err(mkErr(`Unexpected character '${c}'`, pos.line, pos.column));
};

const lexNext = (input: string, pos: Pos): Result<Token, ParseError> => {
  const c = input[pos.offset] ?? '\0';
  const btype = BRACKETS[c];
  if (btype !== undefined) return ok(tokenAt(btype, pos, c));
  if (c === '#' && input[pos.offset + 1] === '{') return ok(tokenAt('lset', pos, '#{'));
  if (c === '|') {
    return err(mkErr("Unexpected character '|': the bar is signature notation only; write a choice as (one-of ...)", pos.line, pos.column));
  }
  return lexAtom(input, pos);
};

const skipGap = (input: string, pos: Pos): Pos => advanceTo(input, pos, gapEnd(input, pos.offset));

const nextToken = (input: string) => (pos: Pos): Result<Step<Pos, Token>, ParseError> | undefined => {
  const start = skipGap(input, pos);
  if (start.offset >= input.length) return undefined;
  const t = lexNext(input, start);
  if (isErr(t)) return err(t.error);
  return ok({ value: t.value, next: advanceTo(input, start, start.offset + t.value.value.length) });
};

export const tokenize = (input: string): Result<ReadonlyArray<Token>, ParseError> => {
  const r = unfold({ offset: 0, line: 1, column: 1 }, nextToken(input));
  if (isErr(r)) return err(r.error);
  const end = skipGap(input, r.value.end);
  return ok([...r.value.values, { type: 'eof', value: '', line: end.line, column: end.column }]);
};

// ── Parser ────────────────────────────────────────────────────────────────────

type PS = { readonly tokens: ReadonlyArray<Token>; readonly position: number };
type PR<T> = Result<{ readonly value: T; readonly next: PS }, ParseError>;
type RFn = (s: PS) => PR<EdnNode>;

const EOF_TOK: Token = { type: 'eof', value: '', line: 0, column: 0 };
const pCur = (s: PS): Token => s.tokens[s.position] ?? EOF_TOK;
const pAdv = (s: PS): PS => (pCur(s).type === 'eof' ? s : { tokens: s.tokens, position: s.position + 1 });
const pIs  = (s: PS, t: string): boolean => pCur(s).type !== 'eof' && pCur(s).type === t;
const pEat = (s: PS, t: string, msg: string): Result<{ readonly tok: Token; readonly next: PS }, ParseError> =>
  pIs(s, t) ? ok({ tok: pCur(s), next: pAdv(s) }) : err(mkErr(msg, pCur(s).line, pCur(s).column));

type ElCtx = { readonly close: string; readonly recur: RFn };
const collectEl = (s: PS, ctx: ElCtx): Result<Unfolded<PS, EdnNode>, ParseError> =>
  unfold(s, (p: PS) => (pIs(p, ctx.close) || pCur(p).type === 'eof' ? undefined : ctx.recur(p)));

type BrCtx = { readonly open: string; readonly close: string; readonly delimiter?: 'vector' | 'set' };
const parseSeq = (s: PS, br: BrCtx, recur: RFn): PR<EdnList> => {
  const t = pCur(s);
  const o = pEat(s, br.open, `Expected ${br.open}`);
  if (isErr(o)) return err(o.error);
  const el = collectEl(o.value.next, { close: br.close, recur });
  if (isErr(el)) return err(el.error);
  const c = pEat(el.value.end, br.close, `Expected ${br.close}`);
  if (isErr(c)) return err(c.error);
  const delimiter = br.delimiter !== undefined ? { delimiter: br.delimiter } : {};
  return ok({ value: { type: 'list', elements: el.value.values, line: t.line, column: t.column, ...delimiter }, next: c.value.next });
};

type Entry = readonly [string, EdnNode];
const entryAt = (recur: RFn) => (s: PS): Result<Step<PS, Entry>, ParseError> | undefined => {
  if (pIs(s, 'rbrace') || pCur(s).type === 'eof') return undefined;
  const kr = recur(s);
  if (isErr(kr)) return err(kr.error);
  const kn = kr.value.value;
  const key = kn.type === 'keyword' ? kn.value.substring(1) : kn.type === 'symbol' ? kn.value : String(kn.type);
  if (pIs(kr.value.next, 'rbrace') || pCur(kr.value.next).type === 'eof') {
    return err(mkErr(`Map key '${key}' lacks a value`, pCur(s).line, pCur(s).column));
  }
  const vr = recur(kr.value.next);
  if (isErr(vr)) return err(vr.error);
  return ok({ value: [key, vr.value.value] as const, next: vr.value.next });
};

const parseM = (s: PS, recur: RFn): PR<EdnMap> => {
  const t = pCur(s);
  const o = pEat(s, 'lbrace', 'Expected {');
  if (isErr(o)) return err(o.error);
  const en = unfold(o.value.next, entryAt(recur));
  if (isErr(en)) return err(en.error);
  const c = pEat(en.value.end, 'rbrace', 'Expected }');
  if (isErr(c)) return err(c.error);
  return ok({ value: { type: 'map', entries: intoMap(en.value.values), line: t.line, column: t.column }, next: c.value.next });
};

const unquote = (s: string): string =>
  s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const COLLECTIONS: ReadonlyMap<string, BrCtx> = intoMap<string, BrCtx>([
  ['lbracket', { open: 'lbracket', close: 'rbracket', delimiter: 'vector' }],
  ['lset', { open: 'lset', close: 'rbrace', delimiter: 'set' }],
]);

const clip = (text: string): string => (text.length > 24 ? `${text.slice(0, 24)}…` : text);

/**
 * Number token to a finite value; a ratio such as `1/5` becomes its quotient.
 * The lexer admits only `-?digits` with an optional `.digits` or `/digits`. A decimal must be
 * finite. An integer, and each part of a ratio, must be a safe integer (within ±(2^53 − 1)),
 * because past that a double silently rounds it to a neighbour. Anything else is a parse
 * error rather than NaN, Infinity or a changed value in the tree (TSF++ Rule 1.13).
 */
const numValue = (t: Token): Result<number, ParseError> => {
  const fail = (message: string): Result<number, ParseError> => err(mkErr(message, t.line, t.column));
  if (t.value.includes('.')) {
    const x = Number.parseFloat(t.value);
    return isFiniteNumber(x) ? ok(x) : fail(`Number '${clip(t.value)}' is out of range`);
  }
  const [num = '', den] = t.value.split('/');
  const label = den === undefined ? 'Integer' : 'Ratio';
  const n = Number.parseFloat(num);
  const d = den === undefined ? 1 : Number.parseFloat(den);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
    return fail(`${label} '${clip(t.value)}' cannot be read exactly: integers must be within ±(2^53 − 1)`);
  }
  return d === 0 ? fail(`Ratio '${clip(t.value)}' divides by zero`) : ok(n / d);
};

const parseNumber = (s: PS): PR<EdnNode> => {
  const t = pCur(s);
  const v = numValue(t);
  if (isErr(v)) return err(v.error);
  return ok({ value: { type: 'number', value: v.value, line: t.line, column: t.column }, next: pAdv(s) });
};

const parseExpr = (s: PS): PR<EdnNode> => {
  const t = pCur(s);
  if (t.type === 'lparen')   return parseSeq(s, { open: 'lparen',   close: 'rparen'  }, parseExpr);
  const collection = COLLECTIONS.get(t.type);
  if (collection !== undefined) return parseSeq(s, collection, parseExpr);
  if (t.type === 'lbrace')   return parseM(s, parseExpr);
  if (t.type === 'keyword')  return ok({ value: { type: 'keyword', value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'symbol')   return ok({ value: { type: 'symbol',  value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'string')   return ok({ value: { type: 'string',  value: unquote(t.value), line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'number')   return parseNumber(s);
  if (t.type === 'boolean')  return ok({ value: { type: 'boolean', value: t.value === 'true', line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'nil')      return ok({ value: { type: 'nil', line: t.line, column: t.column }, next: pAdv(s) });
  return err(mkErr(`Unexpected token: ${t.type}`, t.line, t.column));
};

export const parse = (input: string): Result<ReadonlyArray<EdnNode>, ParseError> => {
  const toks = tokenize(input);
  if (isErr(toks)) return err(toks.error);
  const all = unfold({ tokens: toks.value, position: 0 }, (s: PS) => (pCur(s).type === 'eof' ? undefined : parseExpr(s)));
  return isErr(all) ? err(all.error) : ok(all.value.values);
};

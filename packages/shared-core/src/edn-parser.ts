import { ok, err, isErr, intoMap } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';

export type TokenType =
  | 'lparen' | 'rparen'
  | 'lbracket' | 'rbracket'
  | 'lbrace' | 'rbrace'
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

type LS = { readonly input: string; readonly position: number; readonly line: number; readonly column: number };
type LR = { readonly token: Token; readonly next: LS };

const mkErr = (message: string, line: number, column: number): ParseError => ({ kind: 'ParseError', message, line, column });
const curC = (s: LS): string => s.input[s.position] ?? '\0';
const peekC = (s: LS, off = 1): string => s.input[s.position + off] ?? '\0';
const advL = (s: LS): LS => {
  const c = curC(s);
  return { input: s.input, position: s.position + 1, line: c === '\n' ? s.line + 1 : s.line, column: c === '\n' ? 1 : s.column + 1 };
};
const skipWS = (s: LS): LS => {
  if (s.position >= s.input.length) return s;
  const c = curC(s);
  if (c === ' ' || c === '\t' || c === '\n' || c === '\r') return skipWS(advL(s));
  if (c !== ';') return s;
  const skipLine = (t: LS): LS => (t.position >= t.input.length || curC(t) === '\n' ? t : skipLine(advL(t)));
  return skipWS(skipLine(advL(s)));
};

const isSymS = (c: string): boolean => /^[a-zA-Z_\-+*/?!<>='~]$/.test(c);
const isSymC = (c: string): boolean => isSymS(c) || (c >= '0' && c <= '9');
const isNumS = (s: LS): boolean => {
  const c = curC(s);
  return (c >= '0' && c <= '9') || (c === '-' && peekC(s) >= '0' && peekC(s) <= '9');
};

const lexKw = (s: LS): Result<LR, ParseError> => {
  const col = s.column;
  const go = (t: LS, a: string): LR =>
    isSymC(curC(t)) ? go(advL(t), a + curC(t)) : { token: { type: 'keyword', value: a, line: s.line, column: col }, next: t };
  return ok(go(advL(s), ':'));
};

const lexStr = (s: LS): Result<LR, ParseError> => {
  const col = s.column;
  const go = (t: LS, a: string): Result<LR, ParseError> => {
    if (t.position >= t.input.length) return err(mkErr('Unterminated string', s.line, col));
    const c = curC(t);
    if (c === '"') return ok({ token: { type: 'string', value: a + '"', line: s.line, column: col }, next: advL(t) });
    if (c === '\\') {
      const nt = advL(t);
      return nt.position < nt.input.length ? go(advL(nt), a + '\\' + curC(nt)) : go(nt, a + '\\');
    }
    return go(advL(t), a + c);
  };
  return go(advL(s), '"');
};

const lexNum = (s: LS): Result<LR, ParseError> => {
  const col = s.column;
  const digits = (t: LS, a: string): LR =>
    curC(t) >= '0' && curC(t) <= '9' ? digits(advL(t), a + curC(t)) : { token: { type: 'number', value: a, line: s.line, column: col }, next: t };
  const neg = curC(s) === '-';
  const w = digits(neg ? advL(s) : s, neg ? '-' : '');
  if (curC(w.next) === '.' && peekC(w.next) >= '0' && peekC(w.next) <= '9') {
    const f = digits(advL(w.next), w.token.value + '.');
    return ok({ token: { type: 'number', value: f.token.value, line: s.line, column: col }, next: f.next });
  }
  return ok({ token: { type: 'number', value: w.token.value, line: s.line, column: col }, next: w.next });
};

const lexSym = (s: LS): Result<LR, ParseError> => {
  const col = s.column;
  const go = (t: LS, a: string): LR => {
    if (isSymC(curC(t))) return go(advL(t), a + curC(t));
    const type: TokenType = a === 'true' || a === 'false' ? 'boolean' : a === 'nil' ? 'nil' : 'symbol';
    return { token: { type, value: a, line: s.line, column: col }, next: t };
  };
  return ok(go(s, ''));
};

const BRACKETS: Record<string, TokenType> = {
  '(': 'lparen', ')': 'rparen', '[': 'lbracket', ']': 'rbracket', '{': 'lbrace', '}': 'rbrace',
};

const isNumOrNeg = (ns: LS, c: string): boolean =>
  (c >= '0' && c <= '9') || (c === '-' && isNumS(ns));

const lexNext = (ns: LS): Result<LR, ParseError> => {
  const c = curC(ns);
  const btype = BRACKETS[c];
  if (btype !== undefined) return ok({ token: { type: btype, value: c, line: ns.line, column: ns.column }, next: advL(ns) });
  if (c === ':') return lexKw(ns);
  if (c === '"') return lexStr(ns);
  if (isNumOrNeg(ns, c)) return lexNum(ns);
  if (isSymS(c)) return lexSym(ns);
  return err(mkErr(`Unexpected character '${c}'`, ns.line, ns.column));
};

const collectToks = (s: LS, acc: ReadonlyArray<Token>): Result<ReadonlyArray<Token>, ParseError> => {
  const ns = skipWS(s);
  if (ns.position >= ns.input.length) return ok([...acc, { type: 'eof', value: '', line: ns.line, column: ns.column }]);
  const r = lexNext(ns);
  if (isErr(r)) return err(r.error);
  return collectToks(r.value.next, [...acc, r.value.token]);
};

export const tokenize = (input: string): Result<ReadonlyArray<Token>, ParseError> =>
  collectToks({ input, position: 0, line: 1, column: 1 }, []);

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
const collectEl = (s: PS, acc: ReadonlyArray<EdnNode>, ctx: ElCtx): Result<{ readonly elems: ReadonlyArray<EdnNode>; readonly next: PS }, ParseError> => {
  if (pIs(s, ctx.close) || pCur(s).type === 'eof') return ok({ elems: acc, next: s });
  const r = ctx.recur(s);
  if (isErr(r)) return err(r.error);
  return collectEl(r.value.next, [...acc, r.value.value], ctx);
};

type BrCtx = { readonly open: string; readonly close: string };
const parseSeq = (s: PS, br: BrCtx, recur: RFn): PR<EdnList> => {
  const t = pCur(s);
  const o = pEat(s, br.open, `Expected ${br.open}`);
  if (isErr(o)) return err(o.error);
  const el = collectEl(o.value.next, [], { close: br.close, recur });
  if (isErr(el)) return err(el.error);
  const c = pEat(el.value.next, br.close, `Expected ${br.close}`);
  if (isErr(c)) return err(c.error);
  return ok({ value: { type: 'list', elements: el.value.elems, line: t.line, column: t.column }, next: c.value.next });
};

const collectEnt = (
  s: PS, acc: ReadonlyArray<readonly [string, EdnNode]>, recur: RFn,
): Result<{ readonly entries: ReadonlyArray<readonly [string, EdnNode]>; readonly next: PS }, ParseError> => {
  if (pIs(s, 'rbrace') || pCur(s).type === 'eof') return ok({ entries: acc, next: s });
  const kr = recur(s);
  if (isErr(kr)) return err(kr.error);
  const kn = kr.value.value;
  const key = kn.type === 'keyword' ? kn.value.substring(1) : kn.type === 'symbol' ? kn.value : String(kn.type);
  if (pIs(kr.value.next, 'rbrace') || pCur(kr.value.next).type === 'eof') {
    return err(mkErr(`Map key '${key}' lacks a value`, pCur(s).line, pCur(s).column));
  }
  const vr = recur(kr.value.next);
  if (isErr(vr)) return err(vr.error);
  return collectEnt(vr.value.next, [...acc, [key, vr.value.value]], recur);
};

const parseM = (s: PS, recur: RFn): PR<EdnMap> => {
  const t = pCur(s);
  const o = pEat(s, 'lbrace', 'Expected {');
  if (isErr(o)) return err(o.error);
  const en = collectEnt(o.value.next, [], recur);
  if (isErr(en)) return err(en.error);
  const c = pEat(en.value.next, 'rbrace', 'Expected }');
  if (isErr(c)) return err(c.error);
  return ok({ value: { type: 'map', entries: intoMap(en.value.entries), line: t.line, column: t.column }, next: c.value.next });
};

const unquote = (s: string): string =>
  s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

const parseExpr = (s: PS): PR<EdnNode> => {
  const t = pCur(s);
  if (t.type === 'lparen')   return parseSeq(s, { open: 'lparen',   close: 'rparen'  }, parseExpr);
  if (t.type === 'lbracket') return parseSeq(s, { open: 'lbracket', close: 'rbracket' }, parseExpr);
  if (t.type === 'lbrace')   return parseM(s, parseExpr);
  if (t.type === 'keyword')  return ok({ value: { type: 'keyword', value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'symbol')   return ok({ value: { type: 'symbol',  value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'string')   return ok({ value: { type: 'string',  value: unquote(t.value), line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'number')   return ok({ value: { type: 'number',  value: Number(t.value), line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'boolean')  return ok({ value: { type: 'boolean', value: t.value === 'true', line: t.line, column: t.column }, next: pAdv(s) });
  if (t.type === 'nil')      return ok({ value: { type: 'nil', line: t.line, column: t.column }, next: pAdv(s) });
  return err(mkErr(`Unexpected token: ${t.type}`, t.line, t.column));
};

const collectAll = (s: PS, acc: ReadonlyArray<EdnNode>): Result<ReadonlyArray<EdnNode>, ParseError> => {
  if (pCur(s).type === 'eof') return ok(acc);
  const r = parseExpr(s);
  if (isErr(r)) return err(r.error);
  return collectAll(r.value.next, [...acc, r.value.value]);
};

export const parse = (input: string): Result<ReadonlyArray<EdnNode>, ParseError> => {
  const toks = tokenize(input);
  if (isErr(toks)) return err(toks.error);
  return collectAll({ tokens: toks.value, position: 0 }, []);
};

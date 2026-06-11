import { ok, err, isErr, intoMap } from '@tsfpp/prelude';
const mkErr = (message, line, column) => ({ kind: 'ParseError', message, line, column });
const curC = (s) => s.input[s.position] ?? '\0';
const peekC = (s, off = 1) => s.input[s.position + off] ?? '\0';
const advL = (s) => {
    const c = curC(s);
    return { input: s.input, position: s.position + 1, line: c === '\n' ? s.line + 1 : s.line, column: c === '\n' ? 1 : s.column + 1 };
};
const skipWS = (s) => {
    if (s.position >= s.input.length)
        return s;
    const c = curC(s);
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r')
        return skipWS(advL(s));
    if (c !== ';')
        return s;
    const skipLine = (t) => (t.position >= t.input.length || curC(t) === '\n' ? t : skipLine(advL(t)));
    return skipWS(skipLine(advL(s)));
};
const isSymS = (c) => /^[a-zA-Z_\-+*/?!<>='~]$/.test(c);
const isSymC = (c) => isSymS(c) || (c >= '0' && c <= '9');
const isNumS = (s) => {
    const c = curC(s);
    return (c >= '0' && c <= '9') || (c === '-' && peekC(s) >= '0' && peekC(s) <= '9');
};
const lexKw = (s) => {
    const col = s.column;
    const go = (t, a) => isSymC(curC(t)) ? go(advL(t), a + curC(t)) : { token: { type: 'keyword', value: a, line: s.line, column: col }, next: t };
    return ok(go(advL(s), ':'));
};
const lexStr = (s) => {
    const col = s.column;
    const go = (t, a) => {
        if (t.position >= t.input.length)
            return err(mkErr('Unterminated string', s.line, col));
        const c = curC(t);
        if (c === '"')
            return ok({ token: { type: 'string', value: a + '"', line: s.line, column: col }, next: advL(t) });
        if (c === '\\') {
            const nt = advL(t);
            return nt.position < nt.input.length ? go(advL(nt), a + '\\' + curC(nt)) : go(nt, a + '\\');
        }
        return go(advL(t), a + c);
    };
    return go(advL(s), '"');
};
const lexNum = (s) => {
    const col = s.column;
    const digits = (t, a) => curC(t) >= '0' && curC(t) <= '9' ? digits(advL(t), a + curC(t)) : { token: { type: 'number', value: a, line: s.line, column: col }, next: t };
    const neg = curC(s) === '-';
    const w = digits(neg ? advL(s) : s, neg ? '-' : '');
    if (curC(w.next) === '.' && peekC(w.next) >= '0' && peekC(w.next) <= '9') {
        const f = digits(advL(w.next), w.token.value + '.');
        return ok({ token: { type: 'number', value: f.token.value, line: s.line, column: col }, next: f.next });
    }
    return ok({ token: { type: 'number', value: w.token.value, line: s.line, column: col }, next: w.next });
};
const lexSym = (s) => {
    const col = s.column;
    const go = (t, a) => {
        if (isSymC(curC(t)))
            return go(advL(t), a + curC(t));
        const type = a === 'true' || a === 'false' ? 'boolean' : a === 'nil' ? 'nil' : 'symbol';
        return { token: { type, value: a, line: s.line, column: col }, next: t };
    };
    return ok(go(s, ''));
};
const BRACKETS = {
    '(': 'lparen', ')': 'rparen', '[': 'lbracket', ']': 'rbracket', '{': 'lbrace', '}': 'rbrace',
};
const isNumOrNeg = (ns, c) => (c >= '0' && c <= '9') || (c === '-' && isNumS(ns));
const lexNext = (ns) => {
    const c = curC(ns);
    const btype = BRACKETS[c];
    if (btype !== undefined)
        return ok({ token: { type: btype, value: c, line: ns.line, column: ns.column }, next: advL(ns) });
    if (c === ':')
        return lexKw(ns);
    if (c === '"')
        return lexStr(ns);
    if (isNumOrNeg(ns, c))
        return lexNum(ns);
    if (isSymS(c))
        return lexSym(ns);
    return err(mkErr(`Unexpected character '${c}'`, ns.line, ns.column));
};
const collectToks = (s, acc) => {
    const ns = skipWS(s);
    if (ns.position >= ns.input.length)
        return ok([...acc, { type: 'eof', value: '', line: ns.line, column: ns.column }]);
    const r = lexNext(ns);
    if (isErr(r))
        return err(r.error);
    return collectToks(r.value.next, [...acc, r.value.token]);
};
export const tokenize = (input) => collectToks({ input, position: 0, line: 1, column: 1 }, []);
const EOF_TOK = { type: 'eof', value: '', line: 0, column: 0 };
const pCur = (s) => s.tokens[s.position] ?? EOF_TOK;
const pAdv = (s) => (pCur(s).type === 'eof' ? s : { tokens: s.tokens, position: s.position + 1 });
const pIs = (s, t) => pCur(s).type !== 'eof' && pCur(s).type === t;
const pEat = (s, t, msg) => pIs(s, t) ? ok({ tok: pCur(s), next: pAdv(s) }) : err(mkErr(msg, pCur(s).line, pCur(s).column));
const collectEl = (s, acc, ctx) => {
    if (pIs(s, ctx.close) || pCur(s).type === 'eof')
        return ok({ elems: acc, next: s });
    const r = ctx.recur(s);
    if (isErr(r))
        return err(r.error);
    return collectEl(r.value.next, [...acc, r.value.value], ctx);
};
const parseSeq = (s, br, recur) => {
    const t = pCur(s);
    const o = pEat(s, br.open, `Expected ${br.open}`);
    if (isErr(o))
        return err(o.error);
    const el = collectEl(o.value.next, [], { close: br.close, recur });
    if (isErr(el))
        return err(el.error);
    const c = pEat(el.value.next, br.close, `Expected ${br.close}`);
    if (isErr(c))
        return err(c.error);
    return ok({ value: { type: 'list', elements: el.value.elems, line: t.line, column: t.column }, next: c.value.next });
};
const collectEnt = (s, acc, recur) => {
    if (pIs(s, 'rbrace') || pCur(s).type === 'eof')
        return ok({ entries: acc, next: s });
    const kr = recur(s);
    if (isErr(kr))
        return err(kr.error);
    const kn = kr.value.value;
    const key = kn.type === 'keyword' ? kn.value.substring(1) : kn.type === 'symbol' ? kn.value : String(kn.type);
    if (pIs(kr.value.next, 'rbrace') || pCur(kr.value.next).type === 'eof') {
        return err(mkErr(`Map key '${key}' lacks a value`, pCur(s).line, pCur(s).column));
    }
    const vr = recur(kr.value.next);
    if (isErr(vr))
        return err(vr.error);
    return collectEnt(vr.value.next, [...acc, [key, vr.value.value]], recur);
};
const parseM = (s, recur) => {
    const t = pCur(s);
    const o = pEat(s, 'lbrace', 'Expected {');
    if (isErr(o))
        return err(o.error);
    const en = collectEnt(o.value.next, [], recur);
    if (isErr(en))
        return err(en.error);
    const c = pEat(en.value.next, 'rbrace', 'Expected }');
    if (isErr(c))
        return err(c.error);
    return ok({ value: { type: 'map', entries: intoMap(en.value.entries), line: t.line, column: t.column }, next: c.value.next });
};
const unquote = (s) => s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const parseExpr = (s) => {
    const t = pCur(s);
    if (t.type === 'lparen')
        return parseSeq(s, { open: 'lparen', close: 'rparen' }, parseExpr);
    if (t.type === 'lbracket')
        return parseSeq(s, { open: 'lbracket', close: 'rbracket' }, parseExpr);
    if (t.type === 'lbrace')
        return parseM(s, parseExpr);
    if (t.type === 'keyword')
        return ok({ value: { type: 'keyword', value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
    if (t.type === 'symbol')
        return ok({ value: { type: 'symbol', value: t.value, line: t.line, column: t.column }, next: pAdv(s) });
    if (t.type === 'string')
        return ok({ value: { type: 'string', value: unquote(t.value), line: t.line, column: t.column }, next: pAdv(s) });
    if (t.type === 'number')
        return ok({ value: { type: 'number', value: Number(t.value), line: t.line, column: t.column }, next: pAdv(s) });
    if (t.type === 'boolean')
        return ok({ value: { type: 'boolean', value: t.value === 'true', line: t.line, column: t.column }, next: pAdv(s) });
    if (t.type === 'nil')
        return ok({ value: { type: 'nil', line: t.line, column: t.column }, next: pAdv(s) });
    return err(mkErr(`Unexpected token: ${t.type}`, t.line, t.column));
};
const collectAll = (s, acc) => {
    if (pCur(s).type === 'eof')
        return ok(acc);
    const r = parseExpr(s);
    if (isErr(r))
        return err(r.error);
    return collectAll(r.value.next, [...acc, r.value.value]);
};
export const parse = (input) => {
    const toks = tokenize(input);
    if (isErr(toks))
        return err(toks.error);
    return collectAll({ tokens: toks.value, position: 0 }, []);
};
//# sourceMappingURL=edn-parser.js.map
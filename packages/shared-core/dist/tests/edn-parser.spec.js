import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isOk, isErr, fromNullable, isSome } from '@tsfpp/prelude';
import { parse, tokenize } from '../edn-parser.js';
const nonEof = (toks) => toks.filter((t) => t.type !== 'eof');
describe('tokenize — basic atoms', () => {
    it('tokenizes a keyword', () => {
        const r = tokenize(':foo');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks.length).toBe(1);
        expect(toks[0]?.type).toBe('keyword');
        expect(toks[0]?.value).toBe(':foo');
    });
    it('tokenizes a symbol', () => {
        const r = tokenize('charter');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks[0]?.type).toBe('symbol');
        expect(toks[0]?.value).toBe('charter');
    });
    it('tokenizes a quoted string (raw value includes quotes)', () => {
        const r = tokenize('"hello world"');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks[0]?.type).toBe('string');
        expect(toks[0]?.value).toBe('"hello world"');
    });
});
describe('tokenize — numbers, booleans, brackets, comments', () => {
    it('tokenizes integers and floats', () => {
        const r = tokenize('42 3.14 -7');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks.length).toBe(3);
        expect(toks[0]?.type).toBe('number');
        expect(toks[1]?.type).toBe('number');
        expect(toks[2]?.type).toBe('number');
    });
    it('tokenizes true false nil', () => {
        const r = tokenize('true false nil');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks[0]?.type).toBe('boolean');
        expect(toks[1]?.type).toBe('boolean');
        expect(toks[2]?.type).toBe('nil');
    });
    it('tokenizes brackets', () => {
        const r = tokenize('( [ { } ] )');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks.length).toBe(6);
    });
    it('skips comments', () => {
        const r = tokenize(';; this is a comment\n:foo');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const toks = nonEof(r.value);
        expect(toks.length).toBe(1);
        expect(toks[0]?.type).toBe('keyword');
    });
});
describe('parse — atoms', () => {
    it('parses a keyword', () => {
        const r = parse(':version');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        expect(r.value.length).toBe(1);
        const node = fromNullable(r.value[0]);
        if (!isSome(node))
            return;
        expect(node.value.type).toBe('keyword');
    });
    it('parses a string — unquotes the value', () => {
        const r = parse('"hello"');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node))
            return;
        expect(node.value.type).toBe('string');
        if (node.value.type !== 'string')
            return;
        expect(node.value.value).toBe('hello');
    });
    it('unquotes escape sequences in strings', () => {
        const r = parse('"line1\\nline2"');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node) || node.value.type !== 'string')
            return;
        expect(node.value.value).toBe('line1\nline2');
    });
});
describe('parse — collections: lists and maps', () => {
    it('parses a vector as list', () => {
        const r = parse('[1 2 3]');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node))
            return;
        expect(node.value.type).toBe('list');
        if (node.value.type !== 'list')
            return;
        expect(node.value.elements.length).toBe(3);
    });
    it('parses a map with stripped keyword keys', () => {
        const r = parse('{:key "value"}');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node) || node.value.type !== 'map')
            return;
        expect(node.value.entries.get('key')).toBeDefined();
    });
    it('parses a list form with symbol head', () => {
        const r = parse('(charter "My Project" :version "1.0.0")');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node))
            return;
        expect(node.value.type).toBe('list');
        if (node.value.type !== 'list')
            return;
        expect(node.value.elements.length).toBe(4);
        expect(node.value.elements[0]?.type).toBe('symbol');
    });
});
describe('parse — nested structures', () => {
    it('parses nested maps', () => {
        const r = parse('{:outer {:inner "deep"}}');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const root = fromNullable(r.value[0]);
        if (!isSome(root) || root.value.type !== 'map')
            return;
        const innerOpt = fromNullable(root.value.entries.get('outer'));
        expect(isSome(innerOpt)).toBe(true);
        if (!isSome(innerOpt))
            return;
        expect(innerOpt.value.type).toBe('map');
    });
    it('parses a vector inside a map value', () => {
        const r = parse('{:goals ["one" "two" "three"]}');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const root = fromNullable(r.value[0]);
        if (!isSome(root) || root.value.type !== 'map')
            return;
        const goalsOpt = fromNullable(root.value.entries.get('goals'));
        expect(isSome(goalsOpt)).toBe(true);
        if (!isSome(goalsOpt))
            return;
        expect(goalsOpt.value.type).toBe('list');
        if (goalsOpt.value.type !== 'list')
            return;
        expect(goalsOpt.value.elements.length).toBe(3);
    });
    it('parses deeply nested structure (decisions with evidence)', () => {
        const input = '(charter "P" :decisions [{:choice "Use EDN" :evidence ["fast" "simple"]}])';
        const r = parse(input);
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const node = fromNullable(r.value[0]);
        if (!isSome(node) || node.value.type !== 'list')
            return;
        expect(node.value.elements.length).toBe(4);
    });
});
describe('parse — multi-form and errors', () => {
    it('parses multiple top-level forms', () => {
        const r = parse(':foo :bar :baz');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        expect(r.value.length).toBe(3);
    });
    it('returns error on unclosed bracket', () => {
        const r = parse('(foo bar');
        expect(isErr(r)).toBe(true);
    });
    it('parses symbol map keys', () => {
        const r = parse('{conjure {:arity 2}}');
        expect(isOk(r)).toBe(true);
        if (!isOk(r))
            return;
        const root = fromNullable(r.value[0]);
        if (!isSome(root) || root.value.type !== 'map')
            return;
        const v = fromNullable(root.value.entries.get('conjure'));
        expect(isSome(v)).toBe(true);
    });
});
describe('parse/tokenize — properties', () => {
    it('tokenize always appends eof token for valid symbol atoms', () => {
        fc.assert(fc.property(fc.stringMatching(/^[A-Za-z_\-+*\/?!<>=~][A-Za-z0-9_\-+*\/?!<>=~]*$/), (sym) => {
            const result = tokenize(sym);
            expect(isOk(result)).toBe(true);
            if (!isOk(result))
                return;
            const last = result.value[result.value.length - 1];
            expect(last?.type).toBe('eof');
        }));
    });
    it('parse preserves list arity for number vectors', () => {
        fc.assert(fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (values) => {
            const source = `[${values.join(' ')}]`;
            const result = parse(source);
            expect(isOk(result)).toBe(true);
            if (!isOk(result))
                return;
            const node = fromNullable(result.value[0]);
            expect(isSome(node)).toBe(true);
            if (!isSome(node) || node.value.type !== 'list')
                return;
            expect(node.value.elements.length).toBe(values.length);
        }));
    });
});
//# sourceMappingURL=edn-parser.spec.js.map
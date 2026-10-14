import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isOk, isErr, fromNullable, isSome } from '@tsfpp/prelude';
import { parse, tokenize } from '../edn-parser.js';

const nonEof = <T extends { readonly type: string }>(toks: ReadonlyArray<T>): ReadonlyArray<T> =>
  toks.filter((t) => t.type !== 'eof');

describe('tokenize — basic atoms', () => {
  it('tokenizes a keyword', () => {
    const r = tokenize(':foo');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks.length).toBe(1);
    expect(toks[0]?.type).toBe('keyword');
    expect(toks[0]?.value).toBe(':foo');
  });

  it('tokenizes a symbol', () => {
    const r = tokenize('charter');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks[0]?.type).toBe('symbol');
    expect(toks[0]?.value).toBe('charter');
  });

  it('tokenizes a quoted string (raw value includes quotes)', () => {
    const r = tokenize('"hello world"');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks[0]?.type).toBe('string');
    expect(toks[0]?.value).toBe('"hello world"');
  });
});

describe('tokenize — numbers, booleans, brackets, comments', () => {
  it('tokenizes integers and floats', () => {
    const r = tokenize('42 3.14 -7');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks.length).toBe(3);
    expect(toks[0]?.type).toBe('number');
    expect(toks[1]?.type).toBe('number');
    expect(toks[2]?.type).toBe('number');
  });

  it('tokenizes true false nil', () => {
    const r = tokenize('true false nil');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks[0]?.type).toBe('boolean');
    expect(toks[1]?.type).toBe('boolean');
    expect(toks[2]?.type).toBe('nil');
  });

  it('tokenizes brackets', () => {
    const r = tokenize('( [ { } ] )');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks.length).toBe(6);
  });

  it('skips comments', () => {
    const r = tokenize(';; this is a comment\n:foo');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const toks = nonEof(r.value);
    expect(toks.length).toBe(1);
    expect(toks[0]?.type).toBe('keyword');
  });
});

describe('parse — atoms', () => {
  it('parses a keyword', () => {
    const r = parse(':version');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.length).toBe(1);
    const node = fromNullable(r.value[0]);
    if (!isSome(node)) return;
    expect(node.value.type).toBe('keyword');
  });

  it('parses a string — unquotes the value', () => {
    const r = parse('"hello"');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node)) return;
    expect(node.value.type).toBe('string');
    if (node.value.type !== 'string') return;
    expect(node.value.value).toBe('hello');
  });

  it('unquotes escape sequences in strings', () => {
    const r = parse('"line1\\nline2"');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node) || node.value.type !== 'string') return;
    expect(node.value.value).toBe('line1\nline2');
  });
});

describe('parse — collections: lists and maps', () => {
  it('parses a vector as list', () => {
    const r = parse('[1 2 3]');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node)) return;
    expect(node.value.type).toBe('list');
    if (node.value.type !== 'list') return;
    expect(node.value.elements.length).toBe(3);
  });

  it('parses a map with stripped keyword keys', () => {
    const r = parse('{:key "value"}');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node) || node.value.type !== 'map') return;
    expect(node.value.entries.get('key')).toBeDefined();
  });

  it('parses a list form with symbol head', () => {
    const r = parse('(charter "My Project" :version "1.0.0")');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node)) return;
    expect(node.value.type).toBe('list');
    if (node.value.type !== 'list') return;
    expect(node.value.elements.length).toBe(4);
    expect(node.value.elements[0]?.type).toBe('symbol');
  });
});

describe('parse — nested structures', () => {
  it('parses nested maps', () => {
    const r = parse('{:outer {:inner "deep"}}');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const root = fromNullable(r.value[0]);
    if (!isSome(root) || root.value.type !== 'map') return;
    const innerOpt = fromNullable(root.value.entries.get('outer'));
    expect(isSome(innerOpt)).toBe(true);
    if (!isSome(innerOpt)) return;
    expect(innerOpt.value.type).toBe('map');
  });

  it('parses a vector inside a map value', () => {
    const r = parse('{:goals ["one" "two" "three"]}');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const root = fromNullable(r.value[0]);
    if (!isSome(root) || root.value.type !== 'map') return;
    const goalsOpt = fromNullable(root.value.entries.get('goals'));
    expect(isSome(goalsOpt)).toBe(true);
    if (!isSome(goalsOpt)) return;
    expect(goalsOpt.value.type).toBe('list');
    if (goalsOpt.value.type !== 'list') return;
    expect(goalsOpt.value.elements.length).toBe(3);
  });

  it('parses deeply nested structure (decisions with evidence)', () => {
    const input = '(charter "P" :decisions [{:choice "Use EDN" :evidence ["fast" "simple"]}])';
    const r = parse(input);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const node = fromNullable(r.value[0]);
    if (!isSome(node) || node.value.type !== 'list') return;
    expect(node.value.elements.length).toBe(4);
  });
});

describe('parse — multi-form and errors', () => {
  it('parses multiple top-level forms', () => {
    const r = parse(':foo :bar :baz');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.length).toBe(3);
  });

  it('returns error on unclosed bracket', () => {
    const r = parse('(foo bar');
    expect(isErr(r)).toBe(true);
  });

  it('parses symbol map keys', () => {
    const r = parse('{conjure {:arity 2}}');
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const root = fromNullable(r.value[0]);
    if (!isSome(root) || root.value.type !== 'map') return;
    const v = fromNullable(root.value.entries.get('conjure'));
    expect(isSome(v)).toBe(true);
  });
});

describe('parse/tokenize — properties', () => {
  it('tokenize always appends eof token for valid symbol atoms', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z_\-+*\/?!<>=~][A-Za-z0-9_\-+*\/?!<>=~]*$/), (sym) => {
        const result = tokenize(sym);
        expect(isOk(result)).toBe(true);
        if (!isOk(result)) return;
        const last = result.value[result.value.length - 1];
        expect(last?.type).toBe('eof');
      }),
    );
  });

  it('parse preserves list arity for number vectors', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (values) => {
        const source = `[${values.join(' ')}]`;
        const result = parse(source);
        expect(isOk(result)).toBe(true);
        if (!isOk(result)) return;
        const node = fromNullable(result.value[0]);
        expect(isSome(node)).toBe(true);
        if (!isSome(node) || node.value.type !== 'list') return;
        expect(node.value.elements.length).toBe(values.length);
      }),
    );
  });
});

describe('parse — ratios', () => {
  it('parses a ratio as its quotient and a negative ratio too', () => {
    const r = parse('1/5 -3/4');
    const values = isOk(r) ? r.value.map((n) => (n.type === 'number' ? n.value : NaN)) : [];
    expect(values).toEqual([0.2, -0.75]);
  });

  it('keeps / as a symbol constituent elsewhere', () => {
    const r = parse('w/prototype');
    expect(isOk(r) && r.value[0]?.type === 'symbol').toBe(true);
  });
});

const errorOf = (src: string): string => {
  const r = parse(src);
  return isErr(r) ? `${r.error.line}:${r.error.column} ${r.error.message}` : 'parsed';
};

describe('parse — numbers that cannot be read exactly', () => {
  it('rejects a ratio with a zero denominator, at the token', () => {
    expect(errorOf('[1 1/0]')).toBe("1:4 Ratio '1/0' divides by zero");
    expect(errorOf('-1/0')).toBe("1:1 Ratio '-1/0' divides by zero");
    expect(errorOf('0/0')).toBe("1:1 Ratio '0/0' divides by zero");
  });

  it('accepts integers up to ±(2^53 − 1) and rejects the first ones past it', () => {
    const LIMIT = 'integers must be within ±(2^53 − 1)';
    expect(errorOf('9007199254740991 -9007199254740991')).toBe('parsed');
    expect(errorOf('9007199254740992')).toBe(`1:1 Integer '9007199254740992' cannot be read exactly: ${LIMIT}`);
    expect(errorOf('[0 -9007199254740993]')).toBe(`1:4 Integer '-9007199254740993' cannot be read exactly: ${LIMIT}`);
  });

  it('rejects an integer past the double range instead of reading Infinity', () => {
    expect(errorOf('9'.repeat(400))).toBe(`1:1 Integer '${'9'.repeat(24)}…' cannot be read exactly: integers must be within ±(2^53 − 1)`);
  });

  it('rejects a ratio when either part is past the safe range', () => {
    expect(errorOf('9007199254740993/2')).toMatch(/^1:1 Ratio '9007199254740993\/2' cannot be read exactly/);
    expect(errorOf(`1/${'9'.repeat(400)}`)).toMatch(/^1:1 Ratio '1\/9+…' cannot be read exactly/);
  });

  it('reads a decimal as the nearest double but rejects one past the double range', () => {
    expect(errorOf('9007199254740993.5')).toBe('parsed');
    expect(errorOf(`${'9'.repeat(400)}.5`)).toBe(`1:1 Number '${'9'.repeat(24)}…' is out of range`);
  });

});

// Digit runs of three sizes: short, around 2^53 (16 digits), and past the double range.
const digitRun = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength, maxLength });
const integerRun = fc.oneof(digitRun(1, 5), digitRun(15, 20));
const anyRun = fc.oneof(integerRun, digitRun(309, 400));
const signed = (run: fc.Arbitrary<string>): fc.Arbitrary<string> =>
  fc.tuple(fc.boolean(), run).map(([neg, d]) => `${neg ? '-' : ''}${d}`);
const numberTail = fc.oneof(
  fc.constant(''),
  anyRun.map((d) => `.${d}`),
  fc.oneof(fc.constant('0'), anyRun).map((d) => `/${d}`),
);

describe('parse — numbers that cannot be read exactly: properties', () => {
  it('reads every safe integer exactly', () => {
    fc.assert(
      fc.property(fc.maxSafeInteger(), (n) => {
        const r = parse(String(n));
        const node = isOk(r) ? r.value[0] : undefined;
        expect(node?.type === 'number' ? node.value : 'missing').toBe(n);
      }),
    );
  });

  it('reads every ratio with a non-zero denominator as its finite quotient', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 1_000_000 }), (num, den) => {
        const r = parse(`${num}/${den}`);
        const node = isOk(r) ? r.value[0] : undefined;
        expect(node?.type === 'number' ? node.value : 'missing').toBe(num / den);
      }),
    );
  });

  it('never yields NaN or Infinity for any number the lexer admits', () => {
    fc.assert(
      fc.property(fc.tuple(signed(anyRun), numberTail).map(([whole, tail]) => whole + tail), (src) => {
        const r = parse(src);
        const node = isOk(r) ? r.value[0] : undefined;
        expect(node === undefined || (node.type === 'number' && Number.isFinite(node.value))).toBe(true);
      }),
    );
  });

  it('reads an integer exactly or rejects it, never rounding it', () => {
    fc.assert(
      fc.property(signed(integerRun), (src) => {
        const r = parse(src);
        const node = isOk(r) ? r.value[0] : undefined;
        if (node?.type !== 'number') return;
        expect(BigInt(node.value)).toBe(BigInt(src));
      }),
    );
  });
});

describe('parse — dots in keywords and symbols', () => {
  it('keeps a dot inside a keyword or symbol', () => {
    const r = parse('{:body :die.ivory :pips :die.pip-on-light} java.util.Date');
    const kws = isOk(r) && r.value[0]?.type === 'map' ? Array.from(r.value[0].entries.values()).map((n) => (n.type === 'keyword' ? n.value : '')) : [];
    expect(kws).toEqual([':die.ivory', ':die.pip-on-light']);
    expect(isOk(r) && r.value[1]?.type === 'symbol' && r.value[1].value).toBe('java.util.Date');
  });

  it('still reads decimals as numbers', () => {
    const r = parse('1.5 -0.25');
    expect(isOk(r) ? r.value.map((n) => (n.type === 'number' ? n.value : NaN)) : []).toEqual([1.5, -0.25]);
  });
});

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isOk } from '@tsfpp/prelude';
import { parse, tokenize } from '../edn-parser.js';
import type { Token } from '../edn-parser.js';

// Sizes far past what a per-character or per-element recursion survives on Node's default stack.

/** Offset of the first character of each line, counted independently of the lexer. */
const lineStarts = (input: string): ReadonlyArray<number> =>
  input.split('\n').reduce<{ readonly starts: ReadonlyArray<number>; readonly next: number }>(
    (acc, line) => ({ starts: acc.starts.concat(acc.next), next: acc.next + line.length + 1 }),
    { starts: [], next: 0 },
  ).starts;

/** Every non-eof token's value is the source text at its own line and column. */
const tokensMatchSource = (input: string, toks: ReadonlyArray<Token>): boolean => {
  const starts = lineStarts(input);
  return toks
    .filter((t) => t.type !== 'eof')
    .every((t) => input.startsWith(t.value, (starts[t.line - 1] ?? -1) + t.column - 1));
};

describe('tokenize and parse — long runs of characters', () => {
  it('reads a 200,000-character string', () => {
    const body = 'x'.repeat(200_000);
    const r = parse(`(shape s :notes "${body}")`);
    if (!isOk(r)) return expect.unreachable('expected a parse');
    const [form] = r.value;
    const notes = form?.type === 'list' ? form.elements[3] : undefined;
    expect(notes?.type === 'string' ? notes.value.length : -1).toBe(200_000);
  });

  it('reads a 200,000-character string with escapes', () => {
    const r = tokenize(`"${'a\\"'.repeat(66_667)}"`);
    if (!isOk(r)) return expect.unreachable('expected tokens');
    expect(r.value[0]?.value.length).toBe(200_003);
  });

  it('skips a 200,000-character comment line', () => {
    const r = tokenize(`; ${'c'.repeat(200_000)}\n:after`);
    if (!isOk(r)) return expect.unreachable('expected tokens');
    expect(r.value[0]).toEqual({ type: 'keyword', value: ':after', line: 2, column: 1 });
  });

  it('skips a 200,000-character whitespace run', () => {
    const r = tokenize(`${' \t\r'.repeat(66_667)}\n  :after`);
    if (!isOk(r)) return expect.unreachable('expected tokens');
    expect(r.value[0]).toEqual({ type: 'keyword', value: ':after', line: 2, column: 3 });
  });

  it('reads 200,000-character symbols, keywords and numbers', () => {
    const r = tokenize(`${'s'.repeat(200_000)} :${'k'.repeat(200_000)} ${'9'.repeat(200_000)}`);
    if (!isOk(r)) return expect.unreachable('expected tokens');
    expect(r.value.map((t) => [t.type, t.value.length])).toEqual([
      ['symbol', 200_000], ['keyword', 200_001], ['number', 200_000], ['eof', 0],
    ]);
  });
});

describe('tokenize and parse — many tokens and wide collections', () => {
  it('reads 100,000 top-level tokens', () => {
    const r = parse('a '.repeat(100_000));
    if (!isOk(r)) return expect.unreachable('expected a parse');
    expect(r.value.length).toBe(100_000);
  });

  it('reads a vector of 50,000 elements', () => {
    const r = parse(`[${'1 '.repeat(50_000)}]`);
    if (!isOk(r)) return expect.unreachable('expected a parse');
    const [v] = r.value;
    expect(v?.type === 'list' ? v.elements.length : -1).toBe(50_000);
  });

  it('reads a map of 25,000 entries', () => {
    const entries = Array.from({ length: 25_000 }, (_, i) => `:k${i} ${i}`).join(' ');
    const r = parse(`{${entries}}`);
    if (!isOk(r)) return expect.unreachable('expected a parse');
    const [m] = r.value;
    expect(m?.type === 'map' ? m.entries.size : -1).toBe(25_000);
  });

  it('still reports an unterminated long string at its opening quote', () => {
    const r = parse(`\n  "${'x'.repeat(200_000)}`);
    expect(isOk(r) ? 'parsed' : `${r.error.line}:${r.error.column} ${r.error.message}`).toBe('2:3 Unterminated string');
  });
});

const ATOM = fc.oneof(
  fc.string({ unit: fc.constantFrom(...'abcxyz-_?!*'), minLength: 1, maxLength: 4_000, size: 'max' }).map((s) => `a${s}`),
  fc.string({ unit: fc.constantFrom(...'abc-'), minLength: 1, maxLength: 4_000, size: 'max' }).map((s) => `:${s}`),
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 1, maxLength: 12 }),
  fc.string({ unit: fc.constantFrom(...'ab c\n\t;()[]{}', '\\"', '\\\\', '\\n'), maxLength: 20_000, size: 'max' }).map((s) => `"${s}"`),
  fc.constantFrom('(', ')', '[', ']', '{', '}', '#{', 'true', 'nil'),
);
const GAP = fc.oneof(
  fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r'), minLength: 1, maxLength: 5_000, size: 'max' }),
  fc.string({ unit: fc.constantFrom(...'comment ();"'), maxLength: 20_000, size: 'max' }).map((s) => ` ;${s}\n`),
);

describe('tokenize — property over large generated inputs', () => {
  it('tokenizes and places every token at its own source text', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(ATOM, GAP), { minLength: 1, maxLength: 30 }), (parts) => {
        const input = parts.map(([atom, gap]) => atom + gap).join('');
        const r = tokenize(input);
        return isOk(r) && r.value.length === parts.length + 1 && tokensMatchSource(input, r.value);
      }),
      { numRuns: 25, endOnFailure: true },
    );
  });

  it('parses balanced generated forms of any width', () => {
    const LEAF = fc.oneof(fc.constant('x'), fc.constant(':k'), fc.constant('"s"'), fc.integer().map(String));
    fc.assert(
      fc.property(fc.array(LEAF, { minLength: 0, maxLength: 20_000, size: 'max' }), fc.constantFrom(['(', ')'], ['[', ']'], ['#{', '}']), (leaves, [o, c]) => {
        const r = parse(`${o}${leaves.join(' ')}${c}`);
        const [node] = isOk(r) ? r.value : [];
        return node?.type === 'list' && node.elements.length === leaves.length;
      }),
      { numRuns: 20, endOnFailure: true },
    );
  });
});

const decisionFile = (bytes: number): string => {
  const form = (i: number): string => `(decision d-${i} :evidence [1 2 {:k "v"}] :notes "some notes about this decision")\n`;
  const per = form(0).length;
  return Array.from({ length: Math.ceil(bytes / per) }, (_, i) => form(i)).join('');
};

const medianMs = (input: string): number => {
  const times = [0, 1, 2].map(() => {
    const t0 = performance.now();
    parse(input);
    return performance.now() - t0;
  });
  return [...times].sort((a, b) => a - b)[1] ?? 0;
};

describe('parse — linear cost', () => {
  it('parses a 1 MB file in roughly twice the time of a 0.5 MB file', () => {
    const half = decisionFile(500_000);
    const full = decisionFile(1_000_000);
    expect(isOk(parse(full))).toBe(true);
    medianMs(half); // warm up the JIT
    const ratio = medianMs(full) / Math.max(medianMs(half), 1);
    // Linear is about 2; the former [...acc, x] copying was about 4.
    expect(ratio).toBeLessThan(3);
  });
});

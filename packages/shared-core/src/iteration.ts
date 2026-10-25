/**
 * Iteration over input of unbounded size: characters, tokens, collection elements.
 *
 * JavaScript has no tail-call elimination, so a recursion per character or per element
 * overflows the stack on large input (TSF++ Rule 3.5). These helpers hold the loops and
 * the local mutation; nothing mutable escapes them, so their callers stay pure.
 */
import { ok, err, isErr } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';

/**
 * Advance an index for as long as `step` returns the next one.
 *
 * @param from - The start index.
 * @param step - The next index, which must be larger, or undefined to stop.
 * @returns The index at which `step` stopped.
 */
export const scan = (from: number, step: (i: number) => number | undefined): number => {
  /* eslint-disable functional/no-let, functional/no-loop-statements -- DEVIATION(4.2): no tail-call elimination in JS; a loop keeps the stack depth constant over input size. */
  let i = from;
  let next = step(i);
  while (next !== undefined) {
    i = next;
    next = step(i);
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements */
  return i;
};

/** One value produced by an unfold step, with the state to continue from. */
export type Step<S, T> = { readonly value: T; readonly next: S };

/** The values an unfold produced, with the state it stopped at. */
export type Unfolded<S, T> = { readonly values: ReadonlyArray<T>; readonly end: S };

/**
 * Collect values from a state until `step` stops or fails.
 *
 * @param seed - The start state.
 * @param step - A value and the next state, an error, or undefined to stop.
 * @returns The values in order with the final state, or the first error.
 */
export const unfold = <S, T, E>(
  seed: S,
  step: (s: S) => Result<Step<S, T>, E> | undefined,
): Result<Unfolded<S, T>, E> => {
  /* eslint-disable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data -- DEVIATION(4.2): no tail-call elimination in JS; a loop pushing into a local array keeps stack depth constant and cost linear. */
  const values: T[] = [];
  let s = seed;
  let r = step(s);
  while (r !== undefined) {
    if (isErr(r)) return err(r.error);
    values.push(r.value.value);
    s = r.value.next;
    r = step(s);
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements, functional/prefer-readonly-type, functional/immutable-data */
  return ok({ values, end: s });
};

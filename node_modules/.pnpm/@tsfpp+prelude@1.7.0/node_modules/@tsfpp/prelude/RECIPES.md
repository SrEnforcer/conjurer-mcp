# Recipes

Practical patterns and examples for building on top of `@tsfpp/prelude`. This document is meant to grow over time; entries here cover patterns that are too long for the main README but useful enough to share.

## Exposing a clean package surface

A straightforward way to build your own package on top of the prelude is to expose only stable, high-signal modules and keep helpers internal.

```ts
// src/index.ts
export * from './fp.js';
export * from './validation.js';
export * from './domain/user.js';
```

```ts
// src/validation.ts
import { err, ok, type Result } from '@tsfpp/prelude';

export type ValidationError = {
  readonly code: 'INVALID_EMAIL';
  readonly message: string;
};

export const validateEmail = (value: string): Result<string, ValidationError> =>
  value.includes('@')
    ? ok(value)
    : err({ code: 'INVALID_EMAIL', message: 'Email must contain @' });
```

This keeps consumers on a clean import path and avoids leaking internal helper modules.

## Logger adapter and dependency injection

The prelude exposes a logger port (`Logger`, `LogEntry`, `LogLevel`) so core code can depend on a stable interface while infrastructure selects the concrete logger.

```ts
// src/logger/pino-adapter.ts
import pino from 'pino';
import { type Logger } from '@tsfpp/prelude';

const p = pino({ level: 'info' });

export const logger: Logger = {
  debug: (entry) => p.debug(entry, entry.message),
  info: (entry) => p.info(entry, entry.message),
  warn: (entry) => p.warn(entry, entry.message),
  error: (entry) => p.error(entry, entry.message),
};
```

Inject the port where work happens:

```ts
import { type Logger } from '@tsfpp/prelude';

type Deps = {
  readonly logger: Logger;
};

export const createUserService = ({ logger }: Deps) => ({
  save: (userId: string): void => {
    logger.info({ message: 'saving user', userId });
  },
});
```

Use a silent implementation in tests to avoid noisy output:

```ts
import { type Logger } from '@tsfpp/prelude';

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
```

## Safe field access from unknown objects

When decoding runtime input, first narrow to `UnknownRecord` with `isRecord`, then read typed fields with `getStringField`, `getNumberField`, and `getBooleanField`.

```ts
import {
  err,
  getBooleanField,
  getNumberField,
  getStringField,
  isRecord,
  isSome,
  ok,
  type Result,
} from '@tsfpp/prelude';

type UserInput = {
  readonly name: string;
  readonly age: number;
  readonly active: boolean;
};

const decodeUserInput = (raw: unknown): Result<UserInput, string> => {
  if (!isRecord(raw)) {
    return err('Input must be an object');
  }

  const name = getStringField(raw, 'name');
  const age = getNumberField(raw, 'age');
  const active = getBooleanField(raw, 'active');

  return isSome(name) && isSome(age) && isSome(active)
    ? ok({ name: name.value, age: age.value, active: active.value })
    : err('Invalid or missing fields');
};
```

This pattern keeps boundary validation explicit and composable without throwing.

Note: `getStringField` rejects empty or whitespace-only strings and returns the original string value when valid. `getNumberField` accepts only finite numbers (rejects `NaN`, `Infinity`, and `-Infinity`). `getBooleanField` accepts only strict booleans.

For custom domain types, use `getTypedField` with a runtime guard:

When this is useful:
- Domain-specific fields like `UserId`, `Email`, `Money`, `UUID`, and date-like objects.
- Reusing existing guards/codecs across many record decoders.
- Avoiding many one-off `getXField` helpers.

When it is not enough:
- Cross-field validation (for example, `startDate < endDate`).
- Transforming input (for example, trim + normalize + parse).
- Rich error reporting (you only get `None`, not why it failed).

```ts
import { getTypedField, isRecord, none, type Option } from '@tsfpp/prelude';

type UserId = {
  readonly _tag: 'UserId';
  readonly value: string;
};

const isUserId = (value: unknown): value is UserId =>
  isRecord(value) && value._tag === 'UserId' && typeof value.value === 'string';

const userIdFromPayload = (payload: unknown): Option<UserId> =>
  isRecord(payload) ? getTypedField(payload, 'userId', isUserId) : none;
```

## Collecting optional values with `traverseArrayO` and `sequenceArrayO`

`traverseArrayO` is the Option analogue of `traverseArray`: it maps a function over an array and returns `Some` of all results only if every element produced a `Some`. The moment any element is absent, the whole result is `None`.

```ts
import { traverseArrayO, fromNullable, isSome, isNone } from '@tsfpp/prelude';

// All present — unwrap the values in one step
traverseArrayO(fromNullable)([1, 2, 3]); // Some([1, 2, 3])

// Any absent — fail the whole collection
traverseArrayO(fromNullable)([1, null, 3]); // None
```

This is more useful than a boolean "are all present?" check — you get the unwrapped values when all succeed, not just a `true`.

When you already have a `ReadonlyArray<Option<A>>`, use `sequenceArrayO` directly instead of wrapping in a lambda:

```ts
import { sequenceArrayO, some, none } from '@tsfpp/prelude';

sequenceArrayO([some(1), some(2), some(3)]); // Some([1, 2, 3])
sequenceArrayO([some(1), none, some(3)]);     // None
```

`sequenceArrayO(xs)` is strictly equivalent to `traverseArrayO(x => x)(xs)` — it is just the specialised form for an array you already have.

A practical pattern: decode an array of raw records, collecting field values only when every record is complete.

```ts
import {
  traverseArrayO,
  none,
  getStringField,
  getNumberField,
  isRecord,
  flatMapO,
  mapO,
  type Option,
} from '@tsfpp/prelude';

type Person = { readonly name: string; readonly age: number };

const decodePerson = (raw: unknown): Option<Person> => {
  if (!isRecord(raw)) return none;
  const name = getStringField(raw, 'name');
  const age = getNumberField(raw, 'age');
  return flatMapO((n: string) => mapO((a: number) => ({ name: n, age: a }))(age))(name);
};

// Returns Some([...]) only if every element decodes successfully
const rawArray: ReadonlyArray<unknown> = [
  { name: 'Ada', age: 36 },
  { name: 'Lin', age: 28 },
];
const people = traverseArrayO(decodePerson)(rawArray);
```

## Choosing defaults with `orElse` and `getOrElse`

Use `orElse` when the fallback is still optional, and `getOrElse` when you want a concrete value.

```ts
import {
  fromNonEmptyString,
  getOrElse,
  mapO,
  orElse,
  some,
} from '@tsfpp/prelude';

const parseDisplayName = (raw: string | undefined) => fromNonEmptyString(raw);

// Option -> Option: keep optional context
const withAnonymousFallback = (raw: string | undefined) =>
  orElse(() => some('Anonymous'))(parseDisplayName(raw));

withAnonymousFallback('Ada');
// Some('Ada')
withAnonymousFallback('   ');
// Some('Anonymous')

// Option -> value: collapse to a concrete default
const displayName = (raw: string | undefined): string =>
  getOrElse(() => 'Anonymous')(parseDisplayName(raw));

displayName('Lin');
// 'Lin'
displayName(undefined);
// 'Anonymous'

// You can still keep pipelines before collapsing
const normalized = (raw: string | undefined): string =>
  getOrElse(() => 'anonymous')(
    mapO((name: string) => name.toLowerCase())(parseDisplayName(raw)),
  );
```

## Boundary lifting with Zod

Zod's `safeParse` returns a discriminated `{ success: true, data } | { success: false, error }`. To compose with prelude pipelines, lift it into `Result<A, ZodError>` once at the boundary. Every step after that is just `flatMap` and `map`.

```ts
import { z, type ZodError } from 'zod';
import { ok, err, type Result, flatMap } from '@tsfpp/prelude';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(18),
});
type User = z.infer<typeof userSchema>;

const parseUser = (raw: unknown): Result<User, ZodError> => {
  const parsed = userSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : err(parsed.error);
};
```

Once `parseUser` returns a `Result`, the rest of the pipeline composes normally:

```ts
const loadAndSummarize = (raw: unknown): Result<UserSummary, ZodError> =>
  flatMap(toSummary)(parseUser(raw));
```

A small generic helper makes this less repetitive when you have many schemas:

```ts
import type { ZodSchema } from 'zod';

const fromZod =
  <A>(schema: ZodSchema<A>) =>
  (raw: unknown): Result<A, ZodError> => {
    const parsed = schema.safeParse(raw);
    return parsed.success ? ok(parsed.data) : err(parsed.error);
  };

const parseUser = fromZod(userSchema);
```

This is the canonical use of Zod alongside the prelude: Zod owns the boundary, the prelude owns everything inside.

## `List` versus `ReadonlyArray`

The prelude's `List` is a singly-linked cons list. It is *not* a drop-in replacement for arrays — it makes deliberate trade-offs.

Use a `List` when:
- The workload is **prepend-heavy**. `cons(x)(xs)` is O(1); `[x, ...xs]` allocates a new array each time.
- You are **processing structurally**, recursing on head and tail. Pattern matching on `Cons` / `Nil` matches the algebra exactly.
- You want a **shared, typed empty value** (`nil`) that all empty lists structurally share.

Use a `ReadonlyArray` when:
- You need **random access** by index. `xs[42]` is O(1) on an array; the list version is O(n).
- The workload is **append-heavy**. `appendList` is O(n) in the length of the left side.
- You need to **interop with the wider ecosystem** — JSON, DOM, third-party APIs. Most of TypeScript speaks arrays.

A practical pattern: keep the public surface as `ReadonlyArray`, convert in and out at the boundary when you need list-shaped processing.

```ts
import { fromArray, toArray, type List } from '@tsfpp/prelude';

const fromAPI: ReadonlyArray<number> = await fetchNumbers();
const asList: List<number> = fromArray(fromAPI);
// ... do list-shaped work, e.g. recursive structural processing ...
const result: ReadonlyArray<number> = toArray(asList);
```

A characteristic case where `List` wins: building a result by prepending. The list version is O(n); the naïve array equivalent is O(n²) because each spread allocates a new array.

```ts
import { cons, nil, reverseList, type List } from '@tsfpp/prelude';

// O(n) total — cons is O(1), one final reverse is O(n)
const collect = (input: ReadonlyArray<number>): List<number> =>
  reverseList(input.reduce<List<number>>((acc, n) => cons(n)(acc), nil));
```

## `unique` versus `Set`

The prelude's `unique` returns a `ReadonlyArray<A>` with duplicates removed using `===`. It preserves first-occurrence order. A native `Set` does similar work with different ergonomics.

Pick `unique` when:
- You need to **stay in array shape** for the rest of the pipeline (you're going to `map` and `filter` afterwards).
- **Order matters** and you want first-occurrence.
- You want a **referentially transparent** function that returns a new array.

Pick `Set` (or `[...new Set(xs)]`) when:
- You need **O(1) membership tests** on the deduplicated collection.
- You're handing the collection to an API that takes a `Set`.
- The array is **large enough that performance matters**.

Performance note: `unique` is O(n²) by construction (it uses `Array.prototype.includes` per element, plus an array spread). For large arrays where deduplication is on the hot path, `[...new Set(xs)]` is O(n) and a perfectly fine alternative — the resulting shape is the same, and `Set` also preserves insertion order.

```ts
import { unique } from '@tsfpp/prelude';

const rawTags: ReadonlyArray<string> = ['db', 'auth', 'db', 'billing'];

// Small arrays, in-pipeline, readability first
const tags = unique(rawTags);

// Large arrays, performance-sensitive
const dedup = [...new Set(rawTags)];
```

Both produce a `ReadonlyArray<string>` with first-occurrence order. Pick the one that matches the surrounding code's style and scale.

## Immutable `Map` and `Set` updates

The prelude exposes small helpers for immutable-style `Map` and `Set` workflows.
They return fresh instances for updates and compose cleanly with `Option`.

```ts
import {
  isSome,
  entriesOfMap,
  intoMap,
  lookup,
  assoc,
  dissoc,
} from '@tsfpp/prelude';

const base = intoMap<string, number>([
  ['Ada', 36],
  ['Lin', 28],
]);

const withGrace = assoc('Grace', 31)(base);
const withoutLin = dissoc('Lin')(withGrace);
const rows = entriesOfMap(withoutLin);

const maybeAge = lookup('Ada')(withoutLin);
if (isSome(maybeAge)) {
  console.log(maybeAge.value);
}
```

For `Set`, the pattern is symmetric:

```ts
import {
  intoSet,
  member,
  conj,
  disj,
} from '@tsfpp/prelude';

const base = intoSet(['db', 'auth']);
const withBilling = conj('billing')(base);
const withoutDb = disj('db')(withBilling);

member('auth')(withoutDb);
// true
member('db')(withoutDb);
// false
```

Use these helpers when you want explicit immutable updates without manually cloning `Map`/`Set` on every call site.

When an adapter requires a plain object payload, convert a string-keyed map with `toObject`:

```ts
import { intoMap, toObject } from '@tsfpp/prelude';

const tags = intoMap([
  ['service', 'billing'],
  ['region', 'eu-west-1'],
] as const);

const payload = toObject(tags);
// { service: 'billing', region: 'eu-west-1' }
```

## Filtering undefined values with `isDefined`

Prefer the dedicated guard over inline `x !== undefined` checks when filtering arrays.
It improves readability and preserves precise inferred element types.

```ts
import { isDefined } from '@tsfpp/prelude';

const rawAges: ReadonlyArray<number | undefined> = [18, undefined, 21, undefined, 34];
const ages = rawAges.filter(isDefined);
// ReadonlyArray<number>
```

`isDefined` excludes only `undefined`. If you need to treat both `null` and `undefined` as missing, lift with `fromNullable` and compose with `Option` combinators.

## `pipe`, `flow`, `comp`, and `complement`

### `pipe` — left-to-right sequencing (eager)

`pipe` threads a value through an ordered sequence of unary functions. Import it directly from the prelude — no external dependency required.

```ts
import { pipe, map, flatMap, ok, err, type Result } from '@tsfpp/prelude';

const parseAge = (raw: string): Result<number, string> => {
  const n = Number(raw);
  return Number.isNaN(n) ? err('not a number') : ok(n);
};

const validateAge = (n: number): Result<number, string> =>
  n >= 0 && n < 150 ? ok(n) : err('out of range');

const result = pipe(
  '42',
  parseAge,
  flatMap(validateAge),
  map((n) => ({ age: n })),
);
```

Each step receives the output of the previous. The type of each transition is inferred independently, so a mismatch is caught by the compiler at the call-site.

### `flow` — left-to-right composition (deferred)

`flow` is the deferred twin of `pipe`: it takes only functions and returns a new reusable function. Call it when you want to name a pipeline and invoke it later, or pass it as an argument.

```ts
import { flow, map, flatMap, ok, err, isOk } from '@tsfpp/prelude';

const processAge = flow(
  flatMap(validateAge),
  map((n) => ({ age: n })),
);

// reuse across multiple inputs
const a = processAge(parseAge('42'));
const b = processAge(parseAge('200'));
```

The relationship between the two:
- `flow(f, g, h)(x)` ≡ `pipe(x, f, g, h)` — same order, deferred application
- `flow(f, g, h)(x)` ≡ `comp(h, g, f)(x)` — reversed argument order vs `comp`

Prefer `pipe` when the initial value is at hand. Prefer `flow` when the pipeline is shared, named, or passed as a higher-order argument.

### `comp` — right-to-left composition (point-free)

`comp` builds a new function with functions applied right-to-left — matching standard mathematical composition (f ∘ g means g first, then f). This is Clojure's `comp`.

```ts
import { comp } from '@tsfpp/prelude';

const trim = (s: string): string => s.trim();
const upper = (s: string): string => s.toUpperCase();
const exclaim = (s: string): string => `${s}!`;

const normalise = comp(exclaim, upper, trim);
// normalise('  hello  ') === 'HELLO!'
// equivalent: flow(trim, upper, exclaim)
```

Use `comp` when the right-to-left reading order matches the domain (e.g. `comp(render, validate, parse)` reads "render after validate after parse"). Use `flow` when left-to-right is clearer.

### `complement` — predicate inversion

`complement` inverts a predicate or type guard, returning a new function that flips the boolean result. It works with any arity.

```ts
import { complement, isNone } from '@tsfpp/prelude';

// Inverting a type guard — result is a plain boolean predicate
const isPresent = complement(isNone);

// Useful with collection helpers
const notEmpty = complement((s: string) => s.length === 0);
```

Complement satisfies double negation: `complement(complement(f))(x) ≡ f(x)`. When applied to a type guard `(x: A) => x is B`, the resulting function returns `boolean` — narrowing the complement of a guard is not generally sound, so no narrowing is applied.

## Async error-recovery with `flatMapAsync` and `tapErr`

`flatMapAsync` is the async sibling of `flatMap`: it threads a `Result<A, E>` through a function that returns `Promise<Result<B, E>>`. Combined with `tapErr`, it gives a clean recipe for fallible async operations with observable failure paths — for example, a remote read that retries once on a network failure, logs every failure, and never throws.

```ts
import { isErr, tapErr, flatMapAsync, type Result } from '@tsfpp/prelude';

type ApiError = {
  readonly kind: 'network' | 'parse' | 'auth';
  readonly message: string;
};

const fetchOnce = async (url: string): Promise<Result<unknown, ApiError>> => {
  // adapter boundary — wraps fetch with tryCatchAsync, narrows the error kind, etc.
  // ...
};

const fetchWithOneRetry = async (url: string): Promise<Result<unknown, ApiError>> => {
  const first = await fetchOnce(url);
  if (isErr(first) && first.error.kind === 'network') {
    return fetchOnce(url);
  }
  return first;
};

const parseUserAsync = async (raw: unknown): Promise<Result<User, ApiError>> => {
  // schema validation, lifted to ApiError
  // ...
};

const loadUser = (url: string): Promise<Result<User, ApiError>> =>
  fetchWithOneRetry(url)
    .then(tapErr((e) => log.warn({ msg: 'fetch failed', error: e })))
    .then(flatMapAsync(parseUserAsync));
```

Two things to notice:

1. **`tapErr` does not change the value.** The error still propagates; it only logs.
2. **`flatMapAsync` runs only on `Ok`.** If the fetch failed, `parseUserAsync` is never called.

The resulting pipeline reads as a sequence of small, independent steps. Failure handling is uniform, not woven into each step.

## Signalling success without a payload: `Result<Unit, E>`

Some operations succeed but produce no meaningful value — persisting to a store, dispatching an event, writing a file. TypeScript's `void` is tempting here, but it is not a first-class value: you cannot store it in a record, pass it to a combinator, or serialise it. This breaks the uniformity of `Result` pipelines.

Use `Result<Unit, E>` instead. `Unit` is structurally `undefined`, so `ok(unit)` is a valid `Result<Unit, E>` that composes with every combinator normally. The named constant makes the intent explicit — this is not a gap, it is the entire success payload.

```ts
import { ok, err, unit, type Result, type Unit } from '@tsfpp/prelude';

type SaveError = { readonly code: 'WRITE_FAILED'; readonly reason: string };
type Profile = { readonly id: string; readonly email: string };

const saveProfile = (profile: Profile): Result<Unit, SaveError> => {
  const written = persistToStore(profile);
  return written
    ? ok(unit)
    : err({ code: 'WRITE_FAILED', reason: 'store unavailable' });
};
```

When chaining, `map` on a `Result<Unit, E>` is naturally a no-op on the value side — use it only if you want to project to a different success type. `tap` is often the right tool instead: it fires a side effect on `Ok` and passes the `Result<Unit, E>` through unchanged.

```ts
import { flatMap, map, ok, tap, unit, type Result, type Unit } from '@tsfpp/prelude';

const workflow = (profile: Profile): Result<Unit, SaveError> =>
  flatMap(saveProfile)(
    tap((p: Profile) => log.info({ msg: 'saving', id: p.id }))(ok(profile)),
  );
```

The rule of thumb: reach for `Result<Unit, E>` whenever you would write `Result<void, E>`. The two are semantically equivalent in intent but `Unit` keeps the type system happy and the pipeline uniform.
# @tsfpp/prelude

A small, strongly-typed functional prelude for TypeScript.

It provides:
- Algebraic data types: `Option` and `Result`
- Functional combinators: `pipe`, `flow`, `comp`, `complement`, `map`, `flatMap`, `tap`, `traverse*`, and more
- Lightweight immutable `List` utilities
- Immutable `Map`/`Set` constructor and update helpers
- A dependency-injected logger port for effectful boundaries

Zero runtime dependencies. Data-last curried API. Designed to compose with `pipe`.

## Installation

```sh
pnpm add @tsfpp/prelude
```

## Quick start

```ts
import { ok, err, map, flatMap, type Result } from '@tsfpp/prelude';

const parseNumber = (input: string): Result<number, string> => {
  const parsed = Number(input);
  return Number.isNaN(parsed) ? err('not a number') : ok(parsed);
};

const toEven = (n: number): Result<number, string> =>
  n % 2 === 0 ? ok(n) : err('not even');

const result = flatMap(toEven)(map((n: number) => n + 2)(parseNumber('40')));
```

## Core exports

From `@tsfpp/prelude`:

- **Function combinators**: `pipe`, `flow`, `comp`, `complement`
- **Exhaustiveness**: `absurd`
- **Option**: `some`, `none`, `isSome`, `isNone`, `mapO`, `flatMapO`, `orElse`, `getOrElse`
- **Unit**: `unit`, `Unit`
- **Result**: `ok`, `err`, `isOk`, `isErr`, `map`, `flatMap`, `flatMapAsync`, `tryCatch`, `tryCatchAsync`, `tap`, `tapErr`
- **Logger port**: `LogLevel`, `LogEntry`, `Logger`
- **Conversions and guards**: `fromNullable`, `isDefined`, `toNullable`, `isRecord`, `fromUnknownString`, `fromUnknownArray`, `fromUnknownArrayOf`, `fromNonEmptyString`, `getTypedField`, `getStringField`, `getNumberField`, `getBooleanField`
- **Branded types**: `Brand`, `Every`, `Any`, `mkEvery`, `mkAny`
- **Collection helpers**: `traverseArray`, `traverseArrayO`, `sequenceArrayO`, `unique`, `intoMap`, `entriesOfMap`, `toObject`, `assoc`, `dissoc`, `lookup`, `intoSet`, `conj`, `disj`, `member`
- **Immutable list ADT**: `List`, `nil`, `cons`, `singletonList`, `fromArray`, `toArray`, `headList`, `tailList`, `isEmptyList`, `lengthList`, `mapList`, `flatMapList`, `appendList`, `reverseList`, `filterList`, `foldList`, `foldLeftList`, `foldLeftListCurried`, `traverseList`

## Why a prelude when these libraries exist?

`@tsfpp/prelude` is a minimal, dependency-free package of the functional primitives a strict TypeScript codebase reaches for daily — `Option`, `Result`, `List`, branded types, an exhaustiveness witness, and the combinators to use them. It is small on purpose. Each adjacent library either solves a larger problem or pulls a different API shape.

**fp-ts** offers a comprehensive algebraic library with type classes (`Functor`, `Monad`, `Applicative`), higher-kinded type encoding, and a wide ADT surface (`Option`, `Either`, `Task`, `Reader`, `State`, `Lens`, ...). It is theoretically rigorous, but its HKT encoding, module-registration ceremony, and learning curve are disproportionate when only `Option` and `Result` are needed. Active development has slowed; the original author has redirected effort to Effect.

**Effect** is not in the same category. It is a full effect runtime: fibers, structured concurrency, dependency injection (`Layer` / `Context`), schedules, retries, tracing, and a built-in schema system. Adopting Effect is an architectural commitment that rewrites the shape of every effectful function in the codebase. This prelude takes the opposite stance: effects stay as plain `Promise<Result<A, E>>` and the I/O boundary stays narrow. Effect is excellent — for a different design point.

**neverthrow** is the closest neighbour in spirit: small, focused on `Result`, easy to adopt. Two differences. First, its API is method-chained (`r.map(f).andThen(g)`) rather than data-last functions composed with `pipe`. Both styles have merit; this prelude picks the latter. Second, neverthrow has no `Option` and no `List`, so the absent-value channel and the recursive-structure channel need to come from elsewhere.

**purify-ts** is similar in shape to neverthrow but broader: `Maybe`, `Either`, `EitherAsync`, `NonEmptyList`, and a `Codec` validation layer. Same method-chain API. The codec layer overlaps with Zod, which most projects already use at boundaries. Good library; the surface diverges from the data-last style this prelude follows.

**Remeda** solves a different problem entirely: immutable, typed replacements for Lodash utilities (`groupBy`, `partition`, `pipe`, `pick`, `omit`). It contains no ADTs. This prelude and Remeda are *complementary* — Remeda for collection plumbing, the prelude for the algebra. They sit together without overlap.

**Zod** is a runtime schema validator, not an ADT library. Its role is the boundary: parsing `unknown` from HTTP, files, or storage into validated domain types. The prelude's `fromUnknownString`, `fromUnknownArray`, and `isRecord` are deliberately minimal — for anything more than trivial, lift the Zod result into `Result<A, ZodError>` and let the prelude take over. Strictly complementary; both belong in the same codebase.

### What this prelude uniquely provides

- A small surface — only what a strict functional TypeScript codebase reaches for daily.
- Zero runtime dependencies.
- Plain discriminated unions with a `_tag` discriminator rather than class-based ADTs with methods. The ADTs *are* the data: serializable, structurally typed, no hidden behaviour, no `this`.
- Data-last curried combinators that compose with `pipe`, not method chains.
- Algebraic laws (identity, composition, monad laws) documented inline as JSDoc, alongside each combinator they govern.
- A `List` ADT — none of the adjacent libraries ship one with this exact shape, and most TypeScript codebases reach for arrays where prepend-heavy workloads or structurally recursive processing make a singly-linked list the right tool.
- Branded types with smart constructors as first-class citizens, not an afterthought.
- An `absurd` exhaustiveness witness as a single named export, not coupled to a larger module system.

The prelude is opinionated about style — data-last, `_tag` discriminants, no methods on ADTs — and the opinion is the point. If those choices align with the codebase you are building, this is a working, dependency-free starting point. If you prefer Effect's runtime or fp-ts's type-class machinery, adopt those; the trade-offs are clearly different.

> The conventions encoded here are described more formally in [@tsfpp/standard](https://github.com/tsfpp/standard). The prelude does not depend on it and is usable on its own.

## Usage idioms

These conventions are how the prelude is meant to be used. Following them keeps your code refactor-safe, readable, and consistent with the algebraic laws documented on each combinator.

### Use the type guards, not the `_tag` field

`_tag` is an implementation detail. Use the exported guards.

```ts
// Yes
if (isOk(result)) {
  console.log(result.value);
}

// No — couples your code to the internal shape
if (result._tag === 'Ok') {
  console.log(result.value);
}
```

The one place `_tag` is appropriate is exhaustive pattern matching with `absurd`, where switching on it is canonical:

```ts
const handle = (r: Result<number, string>): string => {
  switch (r._tag) {
    case 'Ok':  return `value: ${r.value}`;
    case 'Err': return `error: ${r.error}`;
    default:    return absurd(r);
  }
};
```

### Compose with combinators, don't unwrap-and-rebuild

If a combinator already exists for what you want to do, use it. Hand-rolling the same logic risks subtle bugs — forgetting to widen `Err`, swallowing variants, dropping a `None` channel.

```ts
// Yes
const doubled = map((n: number) => n * 2)(result);

// No
const doubled = isOk(result) ? ok(result.value * 2) : result;
```

### Use `flatMap` for dependent steps, `map` for independent ones

If the next step might itself fail or be absent, use `flatMap` (or `flatMapO`). If it cannot, use `map` (or `mapO`). Mismatching them produces nested `Result<Result<T, E>, E>` or `Option<Option<T>>`, which is almost never what you want.

```ts
// map: transformation cannot fail
const upper = map((s: string) => s.toUpperCase())(name);

// flatMap: transformation can fail
const validated = flatMap(validateEmail)(input);
```

### Use `orElse` to keep Option context, `getOrElse` to collapse it

For optional data, use `orElse` when you still want an `Option<A>` after fallback. Use `getOrElse` when you want a concrete `A`.

```ts
import {
  fromNonEmptyString,
  getOrElse,
  orElse,
  some,
} from '@tsfpp/prelude';

const parsed = fromNonEmptyString(rawName);

// Option -> Option
const withFallback = orElse(() => some('Anonymous'))(parsed);

// Option -> string
const value = getOrElse(() => 'Anonymous')(parsed);
```

### Use `isDefined` for `undefined` filtering

When narrowing `ReadonlyArray<T | undefined>`, prefer `isDefined` over inline checks.
It keeps call-sites concise and gives proper type narrowing in filter pipelines.

```ts
import { isDefined } from '@tsfpp/prelude';

const raw: ReadonlyArray<number | undefined> = [1, undefined, 2, undefined, 3];
const values = raw.filter(isDefined); // ReadonlyArray<number>
```

`isDefined` excludes only `undefined`. For null-or-undefined lifting, use `fromNullable`.

### Reify thrown exceptions with `tryCatch`, not raw `try/catch`

`tryCatch` and `tryCatchAsync` exist for the adapter boundary — wrapping third-party APIs that throw. Inside your own code, return `Result` directly; don't throw and immediately catch.

```ts
// Yes
const parsed = tryCatch(
  () => JSON.parse(raw),
  (e) => `parse failed: ${String(e)}`,
);

// No — duplicates what tryCatch already does
let parsed: Result<unknown, string>;
try { parsed = ok(JSON.parse(raw)); }
catch (e) { parsed = err(String(e)); }
```

### Prefer `traverseArray` to map-then-sequence

When mapping a fallible function over an array, `traverseArray` short-circuits on the first `Err` and returns `Result<readonly B[], E>` directly.

```ts
// Yes — short-circuits on first Err
const all = traverseArray(parseFoo)(rawItems);

// No — produces ReadonlyArray<Result<Foo, string>>, then needs manual sequencing
const all = rawItems.map(parseFoo);
```

### Construct branded types only through their smart constructors

A branded type's invariants live in its constructor. Casting around the constructor (`raw as NodeId`) defeats the brand entirely.

```ts
// Yes — returns Option<NodeId> or Result<NodeId, E>
const id = mkNodeId(rawString);

// No — bypasses any validation the brand was meant to guarantee
const id = rawString as NodeId;
```

### Use `tap` and `tapErr` for side effects, not by breaking the chain

Logging, metrics, and other observability effects belong in `tap` / `tapErr`. They preserve the value and keep the pipeline intact.

```ts
// Yes
const result = pipe(
  parseInput(raw),
  tap((v) => log.debug({ parsed: v })),
  flatMap(validate),
  tapErr((e) => log.warn({ error: e })),
);

// No — breaks composition for an effect
const parsed = parseInput(raw);
if (isOk(parsed)) log.debug({ parsed: parsed.value });
const validated = flatMap(validate)(parsed);
if (isErr(validated)) log.warn({ error: validated.error });
```

### Depend on the `Logger` port, not a concrete logger

Application and domain layers should depend on the `Logger` interface and receive an implementation through dependency injection. Keep concrete logger libraries (for example `pino` or `winston`) in infrastructure adapters.

```ts
import { type Logger } from '@tsfpp/prelude';

type Deps = {
  readonly logger: Logger;
};

const runUseCase = (deps: Deps) => (userId: string): void => {
  deps.logger.info({ message: 'use-case started', userId });
};
```

Use `LogEntry` as the shared structured payload contract at call-sites. Include `traceId` for request-scoped work whenever available.

### Use `Result<Unit, E>` instead of `Result<void, E>` for success-only results

When a fallible operation succeeds but produces no meaningful value — saving to a database, sending an event, writing a file — the success type should be `Unit`, not `void`. `void` is not a first-class value in TypeScript: you cannot store it, pass it, or serialise it. `Unit` is structurally `undefined` and works everywhere a value is expected.

```ts
import { ok, err, unit, type Result, type Unit } from '@tsfpp/prelude';

const saveSettings = (cfg: Config): Result<Unit, string> =>
  isValid(cfg) ? ok(unit) : err('invalid config');
```

Prefer `ok(unit)` over `ok(undefined)` — the named constant signals that the absence of a value is intentional, not a gap.

### Pairing with `pipe`

The library ships its own `pipe`. No external dependency needed.

```ts
import { pipe, map, flatMap } from '@tsfpp/prelude';
```

```ts
// With pipe — reads top-to-bottom, follows the data flow
const result = pipe(
  parseNumber('40'),
  map((n) => n + 2),
  flatMap(toEven),
);

// Without pipe — reads inside-out
const result = flatMap(toEven)(map((n: number) => n + 2)(parseNumber('40')));
```

### Convert string-keyed maps with `toObject`

Use `toObject` when an adapter boundary needs a plain object shape.

```ts
import { intoMap, toObject } from '@tsfpp/prelude';

const map = intoMap([
  ['service', 'billing'],
  ['region', 'eu-west-1'],
] as const);

const payload = toObject(map);
// { service: 'billing', region: 'eu-west-1' }
```

## Further reading

- [`RECIPES.md`](./RECIPES.md) — patterns for building on top of the prelude

## Scripts

```sh
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run test:coverage
```

## Release process

Releases are automated with Release Please.

1. Use Conventional Commits in merged PRs.
2. Release Please opens/updates a release PR.
3. Merging the release PR publishes a GitHub release and updates `CHANGELOG.md`.

See `.github/workflows/release-please.yml` and `release-please-config.json`.

## License

MIT
# Changelog — @tsfpp/prelude

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

No changes yet.

## [1.7.0] - 2026-05-29

### Features

- add `isDefined` type guard for narrowing `T | undefined` values in filter pipelines
- add `toObject` conversion helper for string-keyed `ReadonlyMap` values

### Changed

- README: document `isDefined` and `toObject` in exports and usage idioms
- RECIPES: add dedicated usage examples for `isDefined` and `toObject`

## [1.6.0] - 2026-05-18

### Features

- **fp:** add logger port types ([`bf645e5`](https://github.com/tsfpp/prelude/commit/bf645e51758cf9f68558368edd428dba3e53c4b9))
- **prelude:** document logger port and release 1.5.0 ([`e4e94f2`](https://github.com/tsfpp/prelude/commit/e4e94f2ccda3ee4d43b9b98a70cbc4630514d578))
- **prelude:** add immutable map/set helpers and document v1.4.0 ([`d4c7b00`](https://github.com/tsfpp/prelude/commit/d4c7b003be72bb7edefc7b6b908875875054850e))
- **prelude:** add traverseArrayO and sequenceArrayO ([`4452492`](https://github.com/tsfpp/prelude/commit/445249243f20b913afe9f5813d122bde48169902))
- **prelude:** add Unit, pipe, flow, comp, and complement ([`4b64a85`](https://github.com/tsfpp/prelude/commit/4b64a850195a993afd887045c6cb7294d59c76e5))

### Bug fixes

- **prelude:** resolve declarationDir to project-local dist/types ([`6f02f75`](https://github.com/tsfpp/prelude/commit/6f02f7555ac693230e89c7cfc266cb398f3b3900))
- **prelude:** resolve declarationDir to project-local dist/types ([`ef896bd`](https://github.com/tsfpp/prelude/commit/ef896bdbe75abff03503f4974c3e51f3bae86b4b))

## [1.5.0] — 2026-05-18

### Added

- Logger port primitives for effectful boundaries:
  - `LogLevel` — supported log severities (`debug` | `info` | `warn` | `error`).
  - `LogEntry` — typed structured log payload.
  - `Logger` — dependency-injected logging interface for app/infrastructure separation.

### Changed

- README: added logger port to feature list, core exports, and usage idioms.
- RECIPES: added logger adapter/injection pattern and test-time silent logger recipe.

## [1.4.1] — 2026-05-16

### Changed

- Build tooling now relies on shared TSFPP presets:
  - TypeScript configs extend `@tsfpp/tsconfig` (`base` and `lib`).
  - ESLint config now uses `@tsfpp/eslint-config` as the sole base.
- Refactored tests into focused files (`fp.test.ts`, `fp.runtime.test.ts`, `fp.collections.test.ts`) to satisfy strict lint constraints.
- Aligned source/test code with shared lint rules while preserving API behavior and passing test coverage.

## [1.4.0] — 2026-05-16

### Added

- `intoMap` — builds a `ReadonlyMap<K, V>` from entry tuples.
- `entriesOfMap` — returns a `ReadonlyArray<readonly [K, V]>` from a `ReadonlyMap<K, V>`.
- `assoc` — immutable-style map upsert; returns a new `ReadonlyMap<K, V>`.
- `dissoc` — immutable-style map delete; returns a new `ReadonlyMap<K, V>`.
- `lookup` — safe lookup from `ReadonlyMap<K, V>` into `Option<V>`.
- `intoSet` — builds a `ReadonlySet<T>` from values.
- `conj` — immutable-style set add; returns a new `ReadonlySet<T>`.
- `disj` — immutable-style set delete; returns a new `ReadonlySet<T>`.
- `member` — membership check for `ReadonlySet<T>`.

### Changed

- README: added immutable `Map`/`Set` helpers to the feature list and core exports.
- RECIPES: added a dedicated section with practical immutable `Map`/`Set` usage patterns.

## [1.3.1] — 2026-05-15

### Changed

- package.json: added keywords for discoverability.
- README: replaced local/sibling coding standard reference with [@tsfpp/standard](https://github.com/tsfpp/standard).

## [1.3.0] — 2026-05-13

### Added

- `traverseArrayO` — Option analogue of `traverseArray`. Maps a function over
  an array and returns `Some` of all results, or `None` on the first absent
  element.
- `sequenceArrayO` — convenience specialisation of `traverseArrayO` for
  collapsing a `ReadonlyArray<Option<A>>` into an `Option<ReadonlyArray<A>>`.

### Changed

- README: added `traverseArrayO` and `sequenceArrayO` to core exports.
- RECIPES: added *Collecting optional values* recipe with practical examples.

## [1.2.1] — 2026-05-13

### Added

- `flow` — left-to-right function composition returning a reusable pipeline
  function. The deferred twin of `pipe`; the left-to-right counterpart of
  `comp`. Overloaded up to 9 steps with full type inference.

### Changed

- README: added `flow` to feature list and core exports.
- RECIPES: expanded the `pipe`/`comp`/`complement` section with a dedicated
  `flow` subsection explaining the relationship between all four combinators.

## [1.2.0] — 2026-05-13

### Added

- `pipe` — left-to-right value pipeline (up to 10 steps, fully typed).
- `comp` — right-to-left function composition (up to 5 functions, fully typed).
- `complement` — predicate/type-guard inversion.
- `Unit` type and `unit` constant — explicit unit for `Result` success variants
  that carry no meaningful value. Prefer `Result<Unit, E>` over `Result<void, E>`.

### Changed

- README: updated feature list and core exports to include new combinators;
  replaced "does not ship its own pipe" note with import example; added
  `Result<Unit, E>` usage idiom.
- RECIPES: added *`pipe`, `comp`, and `complement`* recipe section;
  added *Signalling success without a payload* recipe demonstrating `ok(unit)`.

## [1.1.0] — 2026-05-12

### Added

- Added runtime field readers for validated records: `getStringField`,
  `getNumberField`, and `getBooleanField`.
- Added generic `getTypedField` for custom/domain field decoding via runtime
  type guards.

### Changed

- Expanded README and recipes with safe record-field decoding guidance,
  including when to use `getTypedField` and its limitations.
- Added focused tests for typed record field readers and `getTypedField` edge
  cases.

### Removed

- Removed the Ramda dependency and the `@tsfpp/prelude/ramda` export subpath.

## [1.0.0] — 2026-05-05

### Added

- `absurd` — exhaustiveness helper; narrows `never` at the default branch of
  every exhaustive `switch`.
- `Option<A>` — tagged union `Some<A> | None` with `some`, `none`, `isSome`,
  `isNone`, `fromNullable`, `fromNonEmptyString`, `mapO`, `flatMapO`,
  `getOrElse`, and `orElse`.
- `Result<T, E>` — tagged union `Ok<T> | Err<E>` with `ok`, `err`, `isOk`,
  `isErr`, `map`, `flatMap`, `flatMapAsync`, `tap`, `tapErr`, `tryCatch`, and
  `tryCatchAsync`.
- Conversions and guards: `fromUnknownString`, `fromUnknownArray`,
  `fromUnknownArrayOf`, `toNullable`, and `isRecord`.
- Collection helpers: `traverseArray` and `unique`.
- Immutable `List<A>` ADT with `nil`, `cons`, `fromArray`, `toArray`,
  `headList`, `tailList`, `isEmptyList`, `lengthList`, `mapList`,
  `flatMapList`, `filterList`, `foldList`, `foldLeftListCurried`,
  `appendList`, `reverseList`, and `traverseList`.
- Re-exports of curated Ramda combinators via `@tsfpp/prelude/ramda`.

[Unreleased]: https://github.com/tsfpp/prelude/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/tsfpp/prelude/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/tsfpp/prelude/compare/v1.5.0...v1.6.0

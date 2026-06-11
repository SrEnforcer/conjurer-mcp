# Rationale: §6 — Effect Management

Covers Rules 6.1–6.6 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 6.1 — Errors as data, not exceptions

**Why not `throw`?**

`throw` is invisible in the type system. A function that throws does not signal this anywhere in its signature — the caller has no compile-time indication that the call might fail and has no mechanism to handle failure in the type-safe pipeline it is building.

Compare:

```typescript
// With throw — failure is invisible
const parse = (input: string): AST => {
  if (invalid) throw new SyntaxError(...)
  return ast
}

// With Result — failure is in the signature
const parse = (input: string): Result<AST, ParseError> => {
  if (invalid) return err({ kind: 'syntax_error', ... })
  return ok(ast)
}
```

In the first case, the caller must read the body (or the docs, if they exist and are accurate) to know `parse` can fail. In the second case, the type forces the caller to handle the error case. The compiler will not let them ignore it.

**The analogy with `null`:**

Tony Hoare called `null` his "billion dollar mistake" because it introduced a null reference into a language without type-level tracking. `throw` is the same mistake applied to control flow: a value (the exception) that bypasses the type system entirely and can surface anywhere up the call stack.

**What `Result<T, E>` gives you:**

1. **Composability** — You can `map` over a `Result`, chain multiple fallible operations with `flatMap`, or collect errors with `sequence`. You cannot do any of these with `throw` without wrapping in try/catch at every step.
2. **Exhaustiveness** — Callers that receive `Result<T, E>` must handle both cases to get at the value. The compiler enforces this.
3. **Error typing** — `E` is a typed discriminated union. You can match on specific error kinds, recover from recoverable errors, and propagate unrecoverable ones — all in the type system.

---

## Rule 6.2 — Confine `throw` to adapter boundaries

**Third-party libraries throw. What do you do?**

You cannot prevent third-party code from throwing. The rule is not "eliminate all throws from the runtime" — it is "eliminate throws from your domain code."

The adapter layer is the seam between third-party code and your domain. It:

1. Calls the third-party code inside a `try/catch`.
2. Converts any caught exception to a typed `Result` error.
3. Returns the `Result` to domain code.

Domain code never sees the exception. It only sees `Result<T, E>`.

**Why this boundary matters:**

Without the adapter pattern, an `err` from a file system call can unwind the stack through a parsing pipeline, a rendering function, and a UI event handler before being caught. Each frame in the stack is an opportunity for a missing `catch` to crash the process or produce an unhandled rejection.

With the adapter pattern, the exception is caught at the point of origin, converted to a `Result`, and propagated as a value. The domain code that receives the `Result` can decide how to handle it without any unwind risk.

**What about `async`/`await`?**

`await`-ing a rejected `Promise` throws in an async function. The same adapter pattern applies: wrap the `await` in a `try/catch` at the adapter boundary and return `Promise<Result<T, E>>`.

---

## Rule 6.3 — `Result<T, E>` for failure; `Option<A>` for absence

**Why two types and not just `T | undefined`?**

`T | undefined` conflates two distinct concepts:
- Absence: "there is no value here" (`Option<T>`, `None`)
- Failure: "something went wrong" (`Result<T, E>`, `Err(E)`)

With `T | undefined`, a function that returns `undefined` is ambiguous: did it fail, or was there simply nothing to return? The caller cannot distinguish without reading the body.

`Option` and `Result` carry that distinction explicitly:

```typescript
// "I looked, and there is nothing here"
const findUser = (id: UserId): Option<User> => ...

// "I tried, and it failed for this reason"
const fetchUser = (id: UserId): Promise<Result<User, ApiError>> => ...
```

**Why not just `Either<E, A>` for everything?**

`Either<never, A>` is isomorphic to `Option<A>`. Using `Option` for the "no value" case communicates intent: the absence is expected and not an error condition. Using `Result` for the "failure" case communicates: this is a recoverable or categorizable failure. The two types serve different communication goals.

**Why not `null` instead of `Option`?**

`null` has the same ambiguity problem as `undefined`, plus it requires `strictNullChecks` to be useful. `Option` is a first-class discriminated union that integrates with `switch`, `map`, and `flatMap` without special casing.

---

## Rule 6.4 — `Promise<Result<T, E>>` for async operations

**The rejection channel is an untyped throw:**

`Promise.reject(reason)` is equivalent to `throw reason` in async context. TypeScript cannot type `reason` — the rejection type in `Promise<T>` is always `unknown` (or `any` in older code). There is no way to express "this promise might reject with a `NetworkError` or a `TimeoutError`" in the type system.

`Promise<Result<T, E>>` solves this by moving errors into the success channel where they can be typed. The promise never rejects (in the `UnhandledPromiseRejection` sense); errors are always in the `Result`.

**Pattern:**

```typescript
const fetchUser = async (id: UserId): Promise<Result<User, ApiError>> => {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) return err({ kind: 'http_error', status: response.status })
    const data: unknown = await response.json()
    return parseUser(data)  // returns Result<User, ParseError>
  } catch (e) {
    return err({ kind: 'network_error', message: String(e) })
  }
}
```

The caller gets a `Promise<Result<User, ApiError>>`. They `await` the promise (which never rejects), then handle the `Result`. No try/catch at the call site. Full error visibility.

---

## Rule 6.5 — Isolate I/O; inject dependencies via function parameters

**Why not a global `db` or `fs` import?**

Global imports create hidden dependencies. A function that imports `db` directly cannot be tested without a live database. A function that receives `deps.db` as a parameter can be tested by passing a mock that returns predetermined values.

This is the "poor man's Reader monad" pattern — a simplified version of the Haskell/Scala Reader monad that does not require a monad transformer stack.

**Pattern:**

```typescript
type Deps = {
  readonly db: { readonly findUser: (id: UserId) => Promise<Result<User, DbError>> }
  readonly logger: { readonly log: (msg: string) => void }
}

const getUser = (deps: Deps) => async (id: UserId): Promise<Result<User, DomainError>> => {
  deps.logger.log(`Fetching user ${id}`)
  const result = await deps.db.findUser(id)
  return result
}
```

The outer function takes dependencies; the inner function takes the domain input. This curried form allows partial application: `const getUserFromDeps = getUser(liveDeps)` in production, `const getUserFromMock = getUser(mockDeps)` in tests.

**Why not a dependency injection framework?**

DI frameworks (InversifyJS, tsyringe) use `class` decorators and runtime reflection (`Reflect.metadata`), both of which violate rules 1.9 and 1.8 respectively. Constructor injection via plain functions achieves the same testability without framework coupling.

**When is global state acceptable?**

Configuration that is truly constant for the lifetime of the process (log level, feature flags loaded at startup) can be global. The distinction: it is set once, never mutated, and its value does not affect the correctness of pure functions — only which effects are performed.

---

## Rule 6.6 — Prefer `Promise.allSettled` when partial failure is meaningful

`Promise.all` is an all-or-nothing combinator only when child promises can reject. On first rejection, it short-circuits and discards still-pending sibling outcomes from the caller's perspective.

In fan-out workflows (bulk sync, dashboard widget loading, multi-endpoint aggregation), callers often need a complete report: which tasks succeeded and which failed. `Promise.allSettled` preserves that full outcome vector.

The decision rule is simple:

- Use `Promise.allSettled` for "best effort" and partial-success reporting.
- Use `Promise.all` for strict all-or-nothing semantics.
- If child operations already return `Promise<Result<A, E>>` and do not reject, `Promise.all` is acceptable because failures are encoded in values, not rejection.

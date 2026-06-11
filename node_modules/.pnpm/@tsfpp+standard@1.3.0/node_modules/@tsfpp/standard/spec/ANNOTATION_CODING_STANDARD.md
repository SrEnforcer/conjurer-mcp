# ANNOTATION_CODING_STANDARD.md — Software Annotation Standard

This standard is mandatory for all comments, JSDoc blocks, module headers, code markers, and deviation records in this repository. English only.
Codename TSF++/Annotate (tsfpp-annotate)

**Version:** 1.0.0
**Date:** 2026-05-18
**Classification:** Normative — repository-wide
**Status:** Profile of TSF++ (`CODING_STANDARD.md`) for documentation and annotation

---

## Preamble

### Philosophy

A comment is a message from the past to the future. It should contain exactly what the future reader cannot derive from the code alone — the context, the reasoning, the constraints, the history.

Every comment that paraphrases the code is a comment that did not need to exist, and that will eventually lie. Code changes; comments that follow code drift silently out of date and become misinformation. The standard of care for a comment is therefore higher than for code: a comment must earn its presence.

**The single question that determines whether a comment belongs:**

> Does this tell the reader something they cannot confidently derive from the code and its types?

If the answer is no, the comment is noise. Remove it.

### What code can tell you

The types tell you *what* a function accepts and returns. The implementation tells you *how* it computes the result. A well-named function tells you *what* it computes.

### What only a comment can tell you

- **Why this approach** was chosen over the alternatives the reader will naturally consider
- **Why a constraint exists** that is not obvious from the type signature
- **What was deliberately ruled out** and why
- **Domain knowledge** that lives in the problem space, not the code
- **Known limitations** that are accepted rather than fixed
- **Temporal context**: why a workaround was introduced, when it should be revisited
- **External contracts** that cannot be violated without breaking a third party
- **Non-obvious invariants** that the type system cannot express
- **Performance trade-offs** that justify a non-obvious implementation choice

---

## §1 — Module-level annotations

### Rule 1.1 — Every public module has a module header

Every `.ts` file that exports public API requires a module-level JSDoc block at the top, before any imports.

```ts
/**
 * @module user-account
 *
 * Domain model for user accounts. Provides the `UserAccount` sum type, its
 * smart constructors, and the combinators for working with account state and
 * identity.
 *
 * All functions are pure and total. Error cases are modelled explicitly as
 * `Option<A>` (absent value) or `Result<T, E>` (fallible computation).
 *
 * @packageDocumentation
 */
```

**Rules:**
- First sentence: what the module provides, in imperative or nominal form.
- Second paragraph (optional): key design decisions or constraints a consumer needs to know.
- Never describe the implementation — describe the contract.
- Do not include `@author` or `@since` — that is what git history is for.

### Rule 1.2 — Implementation files without public API are exempt

Files that contain only private helpers, adapters, or internal utilities do not require a module header unless the file contains non-obvious architectural choices worth preserving.

---

## §2 — Function and type annotations

### Rule 2.1 — Every exported symbol has a JSDoc block (MUST)

Every exported `function`, `const` (callable or significant), `type`, and `interface` requires a JSDoc block.

### Rule 2.2 — JSDoc body: the why, not the what

The first sentence of a JSDoc block is the purpose — what the function computes or what the type represents. Everything after that is **why**: invariants, constraints, design rationale, domain rules.

```ts
/**
 * Constructs a validated `UserId` from a raw string.
 *
 * Returns `None` if the input is empty. The empty case is excluded rather
 * than mapped to an error because an empty ID indicates a caller bug, not
 * a domain error — the type system prevents this at compile time in
 * internal code; this guard exists for boundary inputs only.
 *
 * @param raw - The raw string to validate. Must be non-empty.
 * @returns `Some(UserId)` if valid; `None` if empty.
 *
 * @example
 * mkUserId('usr-00123') // => some(UserId('usr-00123'))
 * mkUserId('')          // => none
 */
export const mkUserId = (raw: string): Option<UserId> =>
  raw.length > 0 ? some(raw as UserId) : none
```

### Rule 2.3 — `@param` and `@returns` are required on every exported function

- `@param name — description`: what the parameter represents in the domain, including valid range or constraints not expressed by the type.
- `@returns description`: what the return value means, not its type (the type is already in the signature).

```ts
// Good
// @param limit - Maximum number of results to return. Capped at 100 by the
//                pagination policy; values above 100 are silently clamped.
// @returns The page of results, or `Err('db_unavailable')` if the store
//          cannot be reached within the configured timeout.

// Bad
// @param limit - The limit.
// @returns The result.
```

### Rule 2.4 — `@law` is required on every combinator with algebraic properties

```ts
/**
 * Maps a function over the value inside `Some`, leaving `None` unchanged.
 *
 * @law identity     — `mapO(x => x)(opt) ≡ opt`
 * @law composition  — `mapO(f)(mapO(g)(opt)) ≡ mapO(x => f(g(x)))(opt)`
 */
```

### Rule 2.5 — `@example` is required on smart constructors and non-obvious combinators

Examples must show both the success case and the primary failure case. They must be accurate — the example is part of the specification.

### Rule 2.6 — `@deprecated` with a migration path

```ts
/**
 * @deprecated Since 2.0.0 — use `mkUserId` instead. This function does not
 * validate the empty-string case and will be removed in 3.0.0.
 */
```

Never add `@deprecated` without a replacement and a version.

### Rule 2.7 — `@internal` on symbols that must not be consumed externally

```ts
/**
 * @internal — Not part of the public API. Subject to change without notice.
 */
```

### Rule 2.8 — Do not annotate the obvious

```ts
// Bad — paraphrases the code
/** Returns the length of the array. */
const length = (xs: ReadonlyArray<unknown>): number => xs.length

// Good — adds nothing; the name and signature are sufficient
const length = (xs: ReadonlyArray<unknown>): number => xs.length
```

If a function is so simple its name and signature are self-documenting, no JSDoc is required for non-exported symbols.

---

## §3 — Inline comments

### Rule 3.1 — Explain the why, never the what

```ts
// Bad — restates the code
// Check if the array is empty
if (xs.length === 0) return none

// Good — explains a non-obvious constraint
// The empty case must be handled before the head access below; the type
// system cannot prove non-emptiness here because the array comes from
// an external boundary that does not carry that constraint.
if (xs.length === 0) return none
```

### Rule 3.2 — Document rejected alternatives

When an implementation makes a choice that another developer would reasonably question or "improve", document why the alternative was ruled out:

```ts
// NOTE(rob, 2026-05-18): Linear scan over `ReadonlyArray` rather than `ReadonlyMap`
// lookup. The active session list is always ≤10 items per user in practice;
// the allocation overhead of a map outweighs the O(1) lookup benefit at this scale.
const found = sessions.find(s => s.id === id)
```

### Rule 3.3 — Document non-obvious invariants

When the code relies on a precondition that the type cannot express, make it explicit:

```ts
// Invariant: `handlers` is always registered before this function is called.
// The runtime guarantees registration order; do not call this from a module
// initialiser that may run before the framework bootstraps.
const dispatch = (event: AppEvent): void => { ... }
```

### Rule 3.4 — Document external contracts

When a field name, value, or order is dictated by a third-party system, say so:

```ts
// IMPORTANT: The field name `client_id` is specified by the OAuth2 RFC and
// must not be renamed, even though it conflicts with our camelCase convention.
// DEVIATION(1.8): Field name required by external protocol.
const body = { client_id: credentials.id, ... }
```

### Rule 3.5 — Document accepted imprecision

When a known limitation is intentional rather than an oversight:

```ts
// NOTE(rob, 2026-05-18): Timestamp comparison has ≤1 s imprecision due to
// clock drift between service instances. Acceptable for the audit log use
// case; would not be acceptable for financial ordering.
const isAfter = (a: Date, b: Date): boolean => a.getTime() > b.getTime()
```

### Rule 3.6 — Document performance trade-offs

```ts
// OPTIMIZE(rob, 2026-05-18, ARCH-44): This sorts on every render. Acceptable
// at current account list size (<1000 records). Needs memoisation if the
// collection grows beyond 10k.
const sorted = pipe(accounts, sortBy(a => a.lastName))
```

### Rule 3.7 — Never comment out code

Commented-out code is forbidden. It creates ambiguity about intent, pollutes the diff, and is always better served by git history. Delete it; recover from version control if needed.

```ts
// Bad
// const old = legacyParse(raw)
const result = parse(raw)

// Good
const result = parse(raw)
```

---

## §4 — Code markers

### Rule 4.1 — Required format

Every code marker must follow this exact format:

```ts
// <MARKER>(<author>, <YYYY-MM-DD>[, <ticket>]): <description>
```

| Field | Rule |
|---|---|
| `MARKER` | One of the seven markers below. Uppercase. |
| `author` | GitHub handle or initials of the person adding the marker. Never an AI. If unknown, use `unknown`. |
| `YYYY-MM-DD` | Date the marker was added, not the date the issue was introduced. |
| `ticket` | Optional. Issue or ticket reference (e.g. `PROJ-421`). Required if one exists. |
| `description` | What needs to be done, what the issue is, or what the reader needs to know. Imperative mood. |

### Rule 4.2 — Marker taxonomy

| Marker | Use when | Blocking? |
|---|---|---|
| `TODO` | Work that must be done before the next release | Soft — must have a ticket |
| `FIXME` | Known bug or broken behaviour the author is aware of | Yes — must be resolved before merge if in modified code |
| `HACK` | Temporary workaround with a known correct solution deferred | Yes — must have a ticket and a revisit condition |
| `NOTE` | Important context a reader needs to understand the code correctly | No — informational |
| `OPTIMIZE` | Correct implementation with a known performance concern at scale | No — must reference the scale threshold that triggers action |
| `BUG` | Confirmed bug not yet attributed to a ticket | Yes — must be converted to `FIXME` + ticket before merge |
| `XXX` | Something fragile, surprising, or load-bearing that must not be casually changed | No — use sparingly; must explain what is fragile and why |

### Rule 4.3 — Examples

```ts
// TODO(rjansen, 2026-05-18, ARCH-44): Replace with Result-based validation
//   once the boundary refactor lands in v2.0.

// FIXME(rjansen, 2026-05-18): Returns `none` for whitespace-only strings —
//   should return `err('blank_input')` to distinguish from empty.

// HACK(rjansen, 2026-05-18, INFRA-12): Forced cast because the third-party
//   type definition is wrong. Fixed upstream in v4.x — remove after upgrade.

// NOTE(rjansen, 2026-05-18): The rate-limit window resets at midnight UTC,
//   not relative to the first request. This is a contractual requirement;
//   do not change to a rolling window without legal sign-off.

// OPTIMIZE(rjansen, 2026-05-18, PERF-7): Linear scan acceptable at current
//   user base size (≤10k accounts). Needs a database index above 100k.

// BUG(rjansen, 2026-05-18): Timestamp comparison fails across DST boundaries.
//   Reproduces in November. Converting to ticket.

// XXX(rjansen, 2026-05-18): This initialisation order is load-bearing.
//   The store must be hydrated before any handler is registered. Moving
//   either call without understanding the bootstrap sequence will cause
//   silent failures at runtime.
```

### Rule 4.4 — Stale marker policy

A marker without a ticket that survives more than one release cycle is a violation. Markers must either:
- Be resolved and removed, or
- Be promoted to a tracked ticket and updated with the reference.

Stale `HACK` markers without a revisit condition are always a violation.

---

## §5 — DEVIATION annotations

### Rule 5.1 — Required format

Every intentional TSF++ rule violation requires a DEVIATION comment on the line immediately before the offending construct:

```ts
// DEVIATION(N.M): <one-line justification>
```

Format is exact: `DEVIATION(N.M)` — not `deviation`, not `Deviation`, not `DEVIATION N.M`.

### Rule 5.2 — What the justification must contain

A justification is not a description of the violation — it is the reason it could not be avoided:

```ts
// Bad — describes the violation, not the reason
// DEVIATION(1.4): Using interface here

// Good — explains why no alternative was feasible
// DEVIATION(1.4): Framework plugin API requires an interface;
//   type alias not accepted by the plugin registry's constraint system.
```

### Rule 5.3 — eslint-disable must always be paired with a DEVIATION

```ts
// DEVIATION(1.5): Legacy adapter — raw type narrowed to unknown immediately below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const payload: any = deserialise(raw)
```

Bare `eslint-disable` without a DEVIATION comment is forbidden.

### Rule 5.4 — `as` in smart constructor bodies

The one sanctioned use of `as` in core code requires this exact paired comment:

```ts
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body
return some(raw as UserId)
```

### Rule 5.5 — Project-wide deviations are documented in `DEVIATIONS.md`

Any DEVIATION that applies to more than one file, or that represents a deliberate architectural exception, must be recorded in `DEVIATIONS.md` at the repository root with:
- Rule reference
- Scope (which files / modules)
- Justification
- Condition for removal (version, upstream fix, refactor milestone)

---

## §6 — What not to annotate

The following are always forbidden:

| Violation | Example |
|---|---|
| Paraphrasing the code | `// Check if user is admin` above `if (user.role === 'admin')` |
| Restating the type | `// Returns a string` on a function typed `: string` |
| Commenting out code | `// const old = legacyParse(raw)` |
| Section dividers with no content | `// ─────────────────` with nothing meaningful below |
| Stale comments that no longer match the code | Any comment describing behaviour the code no longer exhibits |
| AI attribution | `// Generated by Claude` or similar — authorship in comments is for humans |
| Obvious example cases | `@example mkLength([]) // => 0` when the name and type say everything |
| `@throws` on functions that return `Result` | The error is in the return type; it is not thrown |
| Apologetic comments | `// This is a bit hacky but...` — use `HACK` with a proper justification |

---

## §7 — Comment quality

### Rule 7.1 — Present tense for descriptions, imperative for markers

```ts
// Good — present tense description
// The cursor encodes the last-seen ID, not a page number, to avoid
// drift when records are inserted between pages.

// Good — imperative marker
// TODO(rob, 2026-05-18): Replace cursor encoding with opaque token.

// Bad — past tense description
// The cursor was changed to encode the last-seen ID.
```

### Rule 7.2 — One idea per comment block

If a comment block is explaining more than one distinct thing, it contains two comments. Split them.

### Rule 7.3 — Comments survive refactoring

When code is refactored, all comments in scope must be reviewed and updated. A comment that describes behaviour the code no longer exhibits is worse than no comment — it is misinformation.

### Rule 7.4 — Precision over hedging

```ts
// Bad — hedging without information
// This might not work in all cases.

// Good — specific about the known limitation
// This comparison fails across DST boundaries in the Europe/Amsterdam
// timezone. Reproducible in November. See BUG above.
```

---

## §8 — Coverage requirements

| Symbol type | JSDoc required | Inline comment required |
|---|---|---|
| Exported function | Always | When behaviour is non-obvious |
| Exported type / branded type | Always | When domain semantics are non-trivial |
| Exported const (non-function) | When non-obvious | Rarely |
| Non-exported helper | Optional | When the approach is non-obvious |
| Implementation body | Never (JSDoc) | When specific lines need explanation |
| Test file | Never (module header) | For non-obvious test setup only |

---

## Appendix A — Annotation review checklist

For use during code review or audit:

**Module**
- [ ] Module header present on all files with public exports
- [ ] First sentence describes the contract, not the implementation

**Functions and types**
- [ ] Every exported symbol has a JSDoc block
- [ ] `@param` and `@returns` present on every exported function
- [ ] `@law` present on all combinators with algebraic properties
- [ ] `@example` present on smart constructors and non-obvious combinators
- [ ] `@deprecated` includes replacement and version

**Inline comments**
- [ ] No comments that paraphrase the code
- [ ] No commented-out code
- [ ] Rejected alternatives documented where a reader would question the choice
- [ ] Non-obvious invariants and external contracts documented
- [ ] Known limitations explicitly marked as intentional

**Code markers**
- [ ] All markers follow the `// MARKER(author, YYYY-MM-DD[, ticket]): description` format
- [ ] No marker missing author or date
- [ ] All `HACK` markers have a ticket and a revisit condition
- [ ] No `BUG` marker without a conversion plan
- [ ] No stale markers surviving more than one release cycle

**Deviations**
- [ ] Every DEVIATION follows the exact `// DEVIATION(N.M): reason` format
- [ ] Every `eslint-disable` is paired with a DEVIATION comment
- [ ] Project-wide deviations recorded in `DEVIATIONS.md`
# Rationale: §1 — Type System

Covers Rules 1.1–1.12 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 1.1 — Tagged discriminated unions

**Why a literal discriminant field?**

TypeScript narrows `switch` and `if` blocks by the type of an expression, not by structural shape alone. Without a shared literal field, the compiler cannot narrow a union member inside a `case` branch — it will narrow to `never` prematurely or not at all.

The `kind` / `_tag` convention comes from the fp-ts tradition (`_tag: 'Some' | 'None'`) and aligns with the ML `datatype` encoding. Using `_tag` with an underscore prefix signals to readers that this field is a type-level discriminant, not a domain field.

**Why not a class hierarchy?**

A class hierarchy can be narrowed with `instanceof`. But `instanceof` depends on the prototype chain, which breaks across iframe boundaries, Jest's module isolation, and serialization round-trips. A literal field survives JSON serialization and structural comparison intact.

**Alternative considered: discriminant via field presence**

Some TypeScript code uses structural presence (`'radius' in s`) as a discriminant. This works for narrowing but is fragile: adding a field to one variant that exists in another breaks all such checks silently. A dedicated discriminant field is a stable, explicit contract.

---

## Rule 1.2 — Exhaustiveness via `never`

**Why is `default` forbidden in exhaustive matches?**

A `default` branch is a catch-all. When a new variant is added to the union, `default` silently handles it — no compile error, no missing case. The `never` assertion in the default branch (`return absurd(s)`) does the opposite: it produces a compile error whenever `s` has a non-`never` type in that branch, i.e., whenever a case is unhandled.

**The `absurd` function:**

```typescript
const absurd = (_: never): never => {
  throw new Error('Impossible: reached absurd branch')
}
```

`absurd` is a proof term. Its type says: "if you can pass a `never` value here, you have a contradiction." In practice, the TypeScript compiler will catch the mistake before runtime; the `throw` is never reached in correct code.

**Why not just rely on `noFallthroughCasesInSwitch`?**

That tsconfig flag prevents *fallthrough* (forgetting a `break`), not *incomplete coverage*. A `switch` with only a `default` branch compiles cleanly with that flag. The `never` assertion is the only way to enforce that every variant is explicitly handled.

---

## Rule 1.3 — Branded types and smart constructors

**Why nominal typing via brands?**

TypeScript's type system is structural: two types with identical shapes are interchangeable. This is generally a strength, but fails for semantically distinct strings or numbers. A `NodeId` and a `DeptId` are both `string` — structural typing would allow passing one where the other is expected.

A brand (`{ readonly __brand: 'NodeId' }`) creates a nominal distinction at the type level with zero runtime cost. The `__brand` field never exists at runtime; it is only present in the type.

**Why restrict construction to smart constructors?**

If any code can write `x as NodeId`, the brand provides no guarantee — it can be forged anywhere. Smart constructors are the single gateway: they validate the raw value, enforce invariants, and then perform the one permitted `as` cast internally. This is the module boundary pattern: the invariant is established once, then preserved by the type system.

**Common objection: "The `as` inside the constructor is a lie"**

True — in the sense that the compiler is being instructed to trust the human. But this is a *local*, *documented* lie with a clearly defined invariant. The alternative (`as NodeId` scattered across the codebase) is a *distributed*, *undocumented* lie. Localizing unsafe operations is the core of the adapter boundary pattern.

---

## Rule 1.4 — `type` over `interface`

**The technical difference:**

`interface` supports declaration merging: two `interface User` declarations in different files will be merged. This is useful for ambient type augmentation (extending third-party types) but is a liability in a codebase where type shapes should be stable and deterministic.

`type` does not merge. A duplicate `type User` is a compile error, as expected.

**Why interfaces are tempting:**

`interface` extends syntax (`interface B extends A`) feels like inheritance and is familiar to OOP developers. In a functional codebase, composition via intersection types (`type C = A & B`) is more explicit and does not imply Liskov-substitution semantics.

**The exception:**

At library boundaries where consumers need to augment your types (e.g., a plugin system, `express.Request` augmentation), `interface` is the right tool. Document the intent explicitly.

---

## Rule 1.5 — No `any`; `unknown` with immediate narrowing

**`any` is an unsound escape hatch:**

`any` disables type checking in both directions: you can assign anything to `any`, and you can assign `any` to anything. It is contagious — a single `any` in a pipeline can widen every downstream type to `any`. Once introduced, it propagates silently.

**Why `unknown` is different:**

`unknown` is the top type: everything is assignable *to* `unknown`, but nothing is assignable *from* `unknown` without a type guard or assertion. This forces narrowing at the point of use, keeping the unsoundness localized and visible.

**The immediate narrowing requirement:**

Allowing `unknown` to "float" across function boundaries exports the narrowing burden to callers who may not have the context to narrow correctly. The rule requires narrowing at the same call site that received the `unknown` value. This keeps the validation logic co-located with the source.

**Common objection: "Sometimes you really don't know the type"**

If you genuinely do not know the shape of the data, you are at a system boundary (deserializing from a network or a file). That is exactly where `unknown` belongs. Write a type guard or a schema validator (`zod`, hand-rolled predicate), narrow immediately, and return a `Result<T, E>`. The `unknown` never leaves the adapter layer.

---

## Rule 1.6 — No `!`; no `as` outside smart constructors

**Why `!` is dangerous:**

`x!` removes `undefined | null` from `x`'s type with no runtime check. If the assumption is wrong, you get a runtime `TypeError` with no type-level evidence that anything went wrong. It is semantically equivalent to `(x as NonNullable<typeof x>)` — an unverified proof obligation handed to the programmer.

The `noUncheckedIndexedAccess` tsconfig flag makes `!` particularly tempting (array access returns `T | undefined`). The correct response is to narrow explicitly (`if (x !== undefined)`) or use `Option`.

**Why `as` is dangerous:**

`as` overrides the type of an expression without changing its runtime value. If the actual value does not match the asserted type, all downstream code operates on a lie. This has caused production defects in typed codebases where `as` was used to silence a type error rather than fix the underlying mismatch.

**The smart constructor exception:**

Within a smart constructor, you have just validated the invariant manually. The `as` on the final return is not bypassing a check — it is the conclusion of a check. This is the *only* context where `as` is meaningful and safe.

---

## Rule 1.7 — Limit type-level metaprogramming

**Why limit conditional and mapped types to utility libraries?**

Complex type-level code produces error messages that are nearly unreadable. A mapped type over a conditional type over a template literal type might be technically correct, but when it goes wrong, the compiler's error output is 40 lines of nested types that obscure the actual mistake.

Domain types should be readable by a TypeScript engineer who is not an expert in type-level programming. Utility types (in the prelude or a dedicated type utilities file) can be complex because they are tested in isolation and documented with their interface contract.

---

## Rule 1.8 — No `enum`

**The numeric reverse-mapping problem:**

Numeric enums in TypeScript have a surprise: `Direction[0]` equals `'North'`. This means a function typed to accept `Direction` will also accept `0`, `1`, `2`, `3` — which are all assignable to a numeric enum. This defeats the purpose of using an enum as a distinct type.

**String enums are slightly better but still generate runtime code:**

`enum Direction { North = 'north' }` compiles to a runtime object. This adds to the bundle for no reason when a string literal union (`'north' | 'south'`) achieves the same type-safety with zero runtime overhead.

**The `const` object alternative:**

```typescript
const Direction = { North: 'north', South: 'south' } as const
type Direction = typeof Direction[keyof typeof Direction]
```

This pattern gets you: autocomplete, exhaustive matching, zero runtime overhead, and no numeric reverse mapping.

---

## Rule 1.9 — No `class`, `this`, `new`, `instanceof`

**Why `class` is incompatible with referential transparency:**

A class instance carries identity — two instances with identical fields are not `===` equal. This breaks structural equality assumptions and makes testing harder (you need to either override `equals` or compare fields manually).

Class methods close over `this`, which can be rebound via `.call`, `.bind`, or accidentally by detaching the method. This is a well-documented source of subtle bugs in JavaScript.

**Why not just "use classes responsibly"?**

The rule is a hard line because "responsible" is subjective and erodes under time pressure. When the standard says `class` is forbidden, reviewers have a mechanical check. When it says "use classes responsibly," every instance requires a judgment call, and judgment calls accumulate inconsistency over time.

**What replaces classes?**

Records (readonly object types) for data. Factory functions (`mkLogger`, `mkParser`) for construction. Module-level closures for encapsulation. This is not novel — it is how most Haskell, Elm, and F# code is organized. The TypeScript type system supports these patterns fully.

**Why `instanceof`?**

`instanceof` checks the prototype chain at runtime. It fails across module boundaries (two versions of the same class loaded into the same runtime), across iframes, and across serialization round-trips. It is also incompatible with the `class`-free world this rule enforces. The discriminant field (Rule 1.1) is the correct alternative.

**The `new` exception:**

Some third-party APIs require `new` (`new URL(...)`, `new Worker(...)`, `new WebSocket(...)`). These are permitted at adapter boundaries and must be wrapped behind a pure facade that hides the `new` from domain code. The goal is not to pretend `new` doesn't exist in the runtime — it is to isolate it so domain code never touches it.

---

## Rule 1.10 — Preserve type guards at narrowing sites

Type guards carry two meanings at once: runtime boolean and compile-time proof. A direct guard call at a narrowing site (`if (isArray(x))`) contributes proof information (`x is ReadonlyArray<unknown>`). Wrapping that guard in a generic boolean combinator discards the proof and keeps only the boolean.

This is why the rule splits usage by position:

- Narrowing site: call the guard directly.
- Predicate-as-value site (`filter`, `partition`, `find`): boolean combinators are acceptable when type refinement is not required by the caller.

The net effect is explicit proof where proofs matter, and ergonomic composition where they do not.

---

## Rule 1.11 — Access prelude ADT discriminants through guards

Direct `_tag` comparisons in consumer code couple callers to a private representation detail of the prelude. If the prelude evolves its internal encoding, all direct tag checks become a breaking change.

Guard functions (`isOk`, `isErr`, `isSome`, `isNone`) preserve both encapsulation and narrowing. They are semantic API surface, not structural leakage.

This rule also improves grepability and review quality. Searching for `isErr(` or `isNone(` shows intent-rich error/absence handling. Searching for string literals (`'Err'`, `'None'`) mixes domain tags and prelude tags and often yields false positives.

---

## Rule 1.12 — `_tag` for prelude ADTs, `kind` for domain ADTs

TSF++ uses two discriminant conventions intentionally:

- `_tag` for library/prelude ADTs.
- `kind` for domain ADTs.

The separation improves cognitive parsing. When a reviewer sees `_tag: 'Some'`, they read "algebraic helper type." When they see `kind: 'submitted'`, they read "business-domain variant." This lowers ambiguity in mixed modules.

It also limits accidental cross-layer drift. Without a convention boundary, domain types can look like library primitives and vice versa, making API migrations and refactors noisier.

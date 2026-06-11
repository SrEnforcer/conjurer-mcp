# Rationale: §2 — Immutability

Covers Rules 2.1–2.5 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 2.1 — `const` only; no `let` or `var`

**Why immutable bindings?**

A `let` binding can be reassigned at any point after declaration. If a function reads a `let` binding twice, it may see different values — the function is no longer referentially transparent. This is the most basic form of temporal coupling: the meaning of a name depends on *when* you read it.

`const` eliminates reassignment. Combined with readonly types, it makes a binding's value stable from the point of declaration to the end of its scope.

**Common objection: "I need a mutable accumulator in a loop"**

The `let` accumulator in a loop is exactly what higher-order functions like `reduce` replace:

```typescript
// With let
let total = 0
for (const x of xs) total += x

// Without let
const total = xs.reduce((acc, x) => acc + x, 0)
```

The `reduce` version has no mutable binding. The accumulator is a function parameter that is re-bound on each recursive step — this is structurally equivalent but does not create a mutable name in scope.

**What about `let` in very small scopes?**

Even in a two-line scope, a `let` creates a name that could be aliased, captured in a closure, or read after mutation. The cognitive overhead of "does this `let` hold its original value here?" accumulates across a codebase. `const` eliminates the question entirely.

**`var`:**

`var` is additionally problematic because it is function-scoped, not block-scoped. Variables declared with `var` inside an `if` block are visible outside it. This is a well-documented source of JavaScript bugs and is forbidden by virtually every modern style guide.

---

## Rule 2.2 — All types must be `readonly` at every level

**Why deep `readonly`, not shallow?**

`Readonly<T>` marks top-level properties as readonly. But if a property is itself an array or an object, that nested structure remains mutable:

```typescript
type Shallow = Readonly<{ items: string[] }>
const s: Shallow = { items: [] }
s.items = []        // compile error — readonly
s.items.push('x')  // compiles — items array is still mutable
```

Referential transparency requires that a value passed into a function cannot be mutated by that function. Shallow `Readonly` does not prevent mutation of nested structures through aliasing.

**`ReadonlyArray<T>` vs `readonly T[]`:**

Both are equivalent to TypeScript. `ReadonlyArray<T>` is preferred for explicitness; the difference is stylistic.

**Performance concern:**

Readonly types have zero runtime cost — they are compile-time annotations only. No copying, no wrapping. The "deep immutability" here is enforced by the type system, not by a runtime proxy.

**What if I need to mutate a nested structure?**

Return a new value with the updated field using spread:

```typescript
const updatedTree: AstNode = {
  ...tree,
  children: [...tree.children, newChild]
}
```

For deeply nested updates, consider a lens or optic abstraction, or Immer's `produce` if the nesting is more than two levels deep.

---

## Rule 2.3 — No mutating array or object operations

**The full list of forbidden array methods:**

`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin` — all mutate in place. They also return the mutated array (or the removed element), making it easy to accidentally chain mutations.

**The alternatives:**

| Mutating | Immutable alternative |
|----------|----------------------|
| `xs.push(x)` | `[...xs, x]` |
| `xs.unshift(x)` | `[x, ...xs]` |
| `xs.pop()` | `xs.slice(0, -1)` |
| `xs.splice(i, 1)` | `[...xs.slice(0, i), ...xs.slice(i + 1)]` |
| `xs.sort(fn)` | `xs.toSorted(fn)` (ES2023+) or `[...xs].sort(fn)` |
| `xs.reverse()` | `xs.toReversed()` (ES2023+) or `[...xs].reverse()` |
| `obj.field = val` | `{ ...obj, field: val }` |
| `delete obj.key` | `{ ...obj }` (omit the key with destructuring if needed) |

**Why `[...xs].sort(fn)` is accepted but `xs.sort(fn)` is not:**

The spread creates a new array; `.sort` on a new array mutates the new array, not the original. The original `xs` is unchanged. This is a locally contained mutation that has no effect outside the expression.

**Why `ReadonlyArray` does not catch all of this:**

`ReadonlyArray<T>` removes mutating methods from its type. But if a value enters your code as a mutable array (from a third-party library, from an API response), the compiler will not prevent mutation until it is typed as `ReadonlyArray`. The rule is a belt-and-suspenders constraint: even if you have a mutable array, do not call mutating methods on it.

---

## Rule 2.4 — Persistent data structures for large collections

**The O(n) problem:**

Spreading a 10,000-element array to add one element copies all 10,000 elements. For most domain code, this is acceptable — the constants are small and immutable copies are cache-friendly. For performance-critical inner loops, it is not.

**When this rule applies:**

This is a SHOULD, not a MUST. It applies when profiling shows that spread-copy overhead is a measurable bottleneck. Do not apply it preemptively.

**Options:**

- **Immer's `produce`** — creates structural sharing automatically. The API looks imperative but is functionally correct: the original is never mutated.
- **Hand-rolled persistent structures** — finger trees, RRB-trees, persistent maps. Higher engineering cost; appropriate only when Immer's overhead is still too high.
- **`Map` / `Set` with immutable wrappers** — for key-value stores where update frequency is high. Use a wrapper that returns a new `Map` on update rather than mutating in place.

**Why not always use persistent structures?**

Persistent data structures add API complexity and dependency weight. For the typical domain object (a record with a few fields, an array of fewer than a thousand items), spread is simpler, faster to read, and fast enough at runtime.

---

## Rule 2.5 — Use `as const` for literal narrowing and config tables

Without `as const`, literal values widen (`'GET'` becomes `string`, `3` becomes `number`). That widening weakens exhaustiveness and can silently permit invalid states in downstream unions.

`as const` gives three benefits at once:

- Literal precision (`'GET'` stays `'GET'`).
- Readonly fields for configuration objects.
- Stable union derivation from value tables (`type HttpMethod = (typeof methods)[number]`).

This rule is a bridge between runtime tables and type-level guarantees. It lets one canonical value declaration drive both behavior and type constraints, reducing duplication and drift.

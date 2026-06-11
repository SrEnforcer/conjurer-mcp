# Rationale: §3 — Functions

Covers Rules 3.1–3.7 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 3.1 — Explicit return type on every exported function

**Why not rely on inference?**

TypeScript's inference is excellent for local types. For exported functions, inference has a specific failure mode: if the implementation changes, the inferred return type changes silently, and consumers of the function see a different type without any indication that the API changed.

Explicit return types make the API contract independent of the implementation. A change to the implementation that accidentally changes the return type becomes a compile error at the function definition, not a cascade of errors at call sites.

**Return types as documentation:**

An explicit return type is the most concise statement of a function's contract. It is the first thing a reviewer reads. It is always in sync with the code (unlike JSDoc, which can drift). It is shown in IDE hovers without requiring the user to look at the body.

**Common objection: "Inference is correct and explicit types are redundant"**

Inference is correct *right now*. Explicit types are a commitment that the return shape will not change without intent. In a codebase with multiple contributors or a long maintenance period, that commitment is valuable.

---

## Rule 3.2 — Maximum 3 positional parameters; ≥ 3 use a record

**The positional parameter problem:**

At a call site, `renderSvg(tree, config, theme, true)` is unreadable without looking at the signature. What does `true` mean? Which argument is `theme`? Positional parameters require callers to memorize order and meaning.

A record parameter self-documents at the call site:

```typescript
renderSvg({ tree, config, theme, debug: true })
```

Every argument is named. Order does not matter. Adding a new optional argument does not change existing call sites.

**Why 3, not 2?**

Two positional parameters is the practical sweet spot: `(a, b)` is readable, `(a, b, c)` is borderline, `(a, b, c, d)` is not. Three is the threshold at which the record form starts paying off. The standard aligns with Python's argument clinic convention (Guido van Rossum's recommendation) and the Haskell convention for curried functions.

**Currying and arity:**

In a heavily curried style (`(a: A) => (b: B) => (c: C) => D`), each curried function has arity 1, so Rule 3.2 is trivially satisfied. The rule targets uncurried multi-parameter functions where positional ambiguity is the risk.

---

## Rule 3.3 — Separate pure and effectful functions by signature

**Why signature-level separation?**

If a function returns `T` directly, a reader can assume it is pure — no I/O, no side effects, no surprises. If it returns `Promise<T>` or `Task<T>`, the reader knows it is effectful. This assumption must hold consistently for the model to be useful.

A function that performs I/O but returns `T` directly violates the model silently. `readFileSync` is a classic example: its return type is `string`, but calling it has observable side effects. The `unsafe` naming convention (Rule 7.4) is the mitigation when such functions exist at adapter boundaries.

**Why `Promise<Result<T, E>>` and not bare `Promise<T>`?**

See Rule 6.4. `Promise<T>` hides errors in the rejection channel, which has the same problems as `throw` — invisible at the type level. `Promise<Result<T, E>>` makes both success and failure first-class values in the success channel.

---

## Rule 3.4 — 40-line limit, complexity ≤ 10, nesting ≤ 4

**Where these numbers come from:**

- **40 lines**: JPL Power of Ten Rule 4 ("functions should not be longer than a printed page"). A modern editor shows roughly 40–60 lines in a standard view. A function that fits in one view can be understood without scrolling.
- **Cyclomatic complexity ≤ 10**: Widely cited threshold from McCabe (1976). Functions with complexity > 10 are statistically correlated with higher defect rates in multiple studies. ESLint's `complexity` rule uses 20 as its default; 10 is more conservative, consistent with JSF++ AV Rule 1.
- **Nesting ≤ 4**: Deeply nested code requires the reader to track multiple open conditions and loops simultaneously. Four levels of nesting is the point at which most developers report comprehension difficulty. Guard clauses (Rule 4.4) are the primary technique for reducing nesting.

**These limits are a design constraint, not an inconvenience:**

A function that cannot be expressed in 40 lines is doing too much. The limits force decomposition into smaller, named functions with clear contracts. This is a feature, not a restriction.

---

## Rule 3.5 — Terminating recursion; prefer tail-recursive form or trampolining

**Why mandate termination?**

JPL Power of Ten Rule 2: "All loops must have a fixed upper bound." Unbounded recursion is equivalent to an unbounded loop — it can exhaust the call stack (stack overflow) on inputs that violate an assumed bound.

**TypeScript does not optimize tail calls:**

ECMAScript 6 specifies proper tail call (PTC) optimization, but V8 never shipped it for regular functions, and TypeScript emits code that runs on V8. A recursive function that "looks" tail-recursive may still overflow the stack at depth ~10,000.

**When trampolining is required:**

Any recursion that may go deeper than ~5,000 levels on realistic input needs a trampoline. The trampoline converts the recursive call into a loop over a data structure that represents "the next step," so the call stack never grows.

**When simple recursion is acceptable:**

Tree traversal on bounded-depth structures (e.g., a UI component tree with a known maximum depth) is acceptable with a documented bound: `// max depth: 64, validated at construction`. The documentation makes the assumption auditable.

---

## Rule 3.6 — Prefer arrow functions over `function` declarations

**The `this` binding issue:**

Arrow functions have no `this` binding — they inherit `this` from the enclosing lexical scope. `function` declarations have their own `this` binding, which is set by the call site. This means a `function` declaration can behave differently depending on *how* it is called (`obj.method()` vs. `const f = obj.method; f()`).

In a codebase that forbids `this` (Rule 1.9), this distinction is moot for domain code. The rule primarily affects whether `function` should be used at module top-level for hoisting.

**The hoisting exception:**

`function` declarations are hoisted to the top of their scope, allowing forward references. This is occasionally useful in recursive data structures where function A calls function B and B calls A. In practice, this can always be resolved by ordering the declarations correctly. The exception exists but should be rare.

---

## Rule 3.7 — No optional parameters; use `Option<T>` or defaults record

**The `undefined`-vs-absent ambiguity:**

An optional parameter `(x?: T)` accepts both `undefined` (explicit) and absent (implicit). With `exactOptionalPropertyTypes` enabled in tsconfig, these two cases are distinguishable in object types — but not in function parameters. Optional parameters collapse them.

**The caller intent problem:**

`findNode(tree, id)` (absent third argument) and `findNode(tree, id, undefined)` (explicit `undefined`) are indistinguishable at the function body level. Was the caller intentionally providing no depth, or accidentally not providing one? `Option<number>` makes the intent explicit:

```typescript
findNode(tree, id, none)       // intentionally no depth
findNode(tree, id, some(10))   // explicitly depth 10
```

**The defaults record exception:**

At CLI or config boundaries where values have defaults, `exactOptionalPropertyTypes` makes optional fields safe. The key distinction: configuration objects at the boundary are different from domain function parameters in the core. Domain functions should not be parameterized by "maybe a value."

# Rationale: §4–5 — Control Flow and Composition

Covers Rules 4.1–5.4 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 4.1 — `switch` with exhaustiveness; no `default` in exhaustive matches

**See also:** [type-system.md — Rule 1.2](./type-system.md) for the `never` assertion pattern.

**Why no `default`?**

`default` defeats the exhaustiveness guarantee. Adding a new variant to a union is a safe operation in a codebase where every consumption site uses a `never` assertion — the compiler will flag every unhandled case at compile time. With a `default`, the new variant silently falls into the catch-all. The compiler says nothing. Users experience unexpected behavior.

This rule is the TypeScript application of JSF++ AV Rule 192: every `switch` must account for all possible values of the discriminant.

**What if there are genuinely "don't care" cases?**

If several cases share the same implementation, group them explicitly:

```typescript
case 'north':
case 'south':
  return handleVertical(s)
case 'east':
case 'west':
  return handleHorizontal(s)
default:
  return absurd(s)
```

The `default: absurd(s)` is still present — it catches any future variant. The grouping of "don't care" cases is explicit and visible.

---

## Rule 4.2 — No `for`, `while`, `do..while`; use higher-order functions

**Why imperative loops are forbidden:**

Every `for` loop requires a mutable accumulator (`let` counter, `let` result). That violates Rule 2.1. The loop body is a statement, not an expression — it cannot be composed or piped. The control flow is implicit in the loop construct rather than explicit in the data transformation.

Higher-order functions make the transformation explicit:

- `map` — "transform every element"
- `filter` — "keep elements that satisfy a predicate"
- `reduce` — "aggregate elements into a single value"
- `flatMap` — "transform and flatten"
- `find` — "find the first element satisfying a predicate"

These express *intent* directly. A reader sees `filter(isActive)` and knows what is happening without parsing the loop body.

**The performance exception:**

In layout algorithms, rendering hot paths, or parsing inner loops, `for` is sometimes necessary to avoid the overhead of callback allocation per iteration. The exception requires: `// DEVIATION(4.2): hot path, profiled`, local mutation only (no mutation visible outside the function), and a benchmark that justifies the deviation.

"I think it's faster" is not sufficient justification. Profiling is required.

**What about `for...of` on iterators?**

`for...of` is syntactic sugar for iterator protocol consumption. It can be replaced with `Array.from(iter).reduce(...)` or a Remeda/prelude equivalent. For lazy infinite iterators, a custom `reduce`-over-iterator helper is appropriate and should be placed in the prelude.

---

## Rule 4.3 — Ternary for simple branches; `if`/`else` for complex

**Ternary is an expression; `if` is a statement:**

An expression has a value; a statement does not. In a functional style, you want every construct to be composable — expressions compose, statements do not. A ternary can appear inside a `pipe`, be the right-hand side of a `const`, or be passed to a function. An `if` block cannot.

**When ternary becomes harmful:**

Nested ternaries beyond one level become unreadable faster than any other construct. Three levels of nesting creates 8 possible paths that the reader must trace simultaneously. The rule caps nesting at one level.

For complex branching, `if`/`else` with guard clauses (Rule 4.4) is clearer because the reader can see each case in isolation.

---

## Rule 4.4 — Guard clauses; maximum nesting depth 4

**The "golden path" principle:**

Guard clauses invert the typical if/else structure: instead of wrapping the happy path in the outermost `if`, they return early on error conditions. This leaves the happy path at the shallowest indentation level — visually dominant, easy to follow.

```typescript
// Deeply nested (avoid)
const process = (input: Option<string>): Result<Output, Err> => {
  if (input._tag === 'Some') {
    const trimmed = input.value.trim()
    if (trimmed.length > 0) {
      return ok(transform(trimmed))
    } else {
      return err('empty')
    }
  } else {
    return err('missing')
  }
}

// Guard clauses (prefer)
const process = (input: Option<string>): Result<Output, Err> => {
  if (input._tag === 'None') return err('missing')
  const trimmed = input.value.trim()
  if (trimmed.length === 0) return err('empty')
  return ok(transform(trimmed))
}
```

The guard-clause version has zero nesting. Each error condition is handled immediately when it is detected.

---

## Rule 4.5 — No truthiness checks on non-boolean values

**JavaScript truthiness is a trap:**

In JavaScript, the following values are falsy: `false`, `0`, `""`, `null`, `undefined`, `NaN`. All other values are truthy. This means `if (x)` is false for `x = 0`, `x = ""`, `x = null`, and `x = undefined` — four completely different semantic situations collapsed into a single check.

The specific problem in TypeScript: `""` is a valid string in many domains (an empty body, a cleared input field). Treating it as falsy is a domain logic error disguised as a type error.

**The explicit comparison requirement:**

```typescript
// Wrong — 0 and "" are valid values that should not be treated as "no value"
if (count) { ... }
if (label) { ... }

// Correct
if (count !== 0) { ... }
if (label.length > 0) { ... }
if (label !== '') { ... }
```

**`null` and `undefined` specifically:**

`value !== undefined` is the correct check for an optional value. `value !== null` for nullable values. `value != null` (double equals) catches both `null` and `undefined`, which is acceptable in specific cases but should be documented.

---

## Rule 5.1 — `pipe` for multi-step transformations; limit to 8 stages

**Why `pipe` instead of nested calls?**

Nested function calls read inside-out: `h(g(f(x)))` must be parsed right-to-left. With `pipe`, data flows left-to-right, matching how the transformation is described:

```typescript
// Inside-out — harder to follow
const result = sort(compareFn, map(toSummary, filter(isActive, employees)))

// Left-to-right with pipe — data flow is obvious
const result = pipe(
  filter(isActive),
  map(toSummary),
  sort(compareFn),
)(employees)
```

This mirrors Unix pipes (`employees | filter_active | to_summary | sort`) and the `|>` operator in F#, Elixir, and OCaml.

**Why limit to 8 stages?**

A pipeline with more than 8 stages is likely doing too much as a single expression. Stages 1–4 are usually a coherent sub-transformation that deserves a named intermediate binding. Splitting a long pipeline at named checkpoints also aids debugging: you can log or inspect the intermediate value.

---

## Rule 5.2 — Point-free with restraint

**When point-free is good:**

Short pipelines of well-named standard combinators are more readable in point-free style:

```typescript
const activeNames = pipe(filter(isActive), map(prop('name')))
```

The data flow is clear even without naming the input. The combinators (`isActive`, `prop('name')`) are descriptive.

**When point-free is harmful:**

Long chains of anonymous functions, flipped arguments, and nested `pipe` calls within `pipe` calls lose all connection to the data shape:

```typescript
const f = pipe(
  filter(flip(prop)('active')),
  map(pipe(prop('name'), toUpper, trim))
)
```

What is the type of the input? What does `flip(prop)('active')` mean? A reader without deep knowledge of functional utility combinators cannot answer these questions without running the code.

The rule of thumb: if a reader must execute the pipeline mentally to understand what type it operates on, add explicit lambdas.

---

## Rule 5.4 — IIFE for scoping

**Why IIFEs and not `let`?**

Sometimes a computation requires multiple steps before producing a value, and extracting a named function would add ceremony with no clarity benefit. An IIFE keeps the computation inline and avoids introducing a mutable `let` binding.

```typescript
const label = (() => {
  const base = node.displayName ?? node.handle
  const suffix = node.archived ? ' (archived)' : ''
  return `${base}${suffix}`
})()
```

The IIFE scopes `base` and `suffix` locally. Without the IIFE, you would need a named function or a `let label` that is reassigned.

**The 5-line limit:**

An IIFE longer than 5 lines indicates a concept that deserves a name. Extract a named function. The IIFE is an expression-scope tool, not a general purpose alternative to functions.

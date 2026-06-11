# Rationale: §9 — Compiler and Tooling Configuration

Covers Rules 9.1–9.6 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 9.1 — Mandatory `tsconfig.json` compiler flags

Each flag in the required set closes a specific soundness gap. This file documents what each flag does and why it is non-negotiable.

### `strict: true`

Enables a bundle of strict checks: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`. Every sub-flag in `strict` addresses a known TypeScript soundness gap. Disabling any of them undermines the other rules in this standard.

`noImplicitAny` is the most important: without it, unannotated expressions default to `any`, silently bypassing the type system for every unannotated function parameter.

### `noUncheckedIndexedAccess: true`

Without this flag, `xs[0]` has type `T` (or `undefined` is silently dropped). With it, `xs[0]` has type `T | undefined`. This forces callers to narrow before use, which directly enforces Rule 1.6 (no `!`). Without this flag, `xs[0]!` looks like a reasonable alternative; with it, the narrowing is mandatory and explicit.

This is one of the most impactful flags for catching real bugs. Index-out-of-bounds is a common source of runtime errors that would be caught at compile time with this flag.

### `exactOptionalPropertyTypes: true`

Distinguishes `{ key?: T }` (key may be absent) from `{ key?: T | undefined }` (key may be present with value `undefined`). Without this flag, you can write `obj.key = undefined` to an optional field even if `undefined` was never intended — a subtle soundness hole.

This flag makes Rule 6.3 (use `Option<T>` for absence) more meaningful: with `exactOptionalPropertyTypes`, optional properties and `Option<T>` fields are clearly distinct choices.

### `noFallthroughCasesInSwitch: true`

Prevents a `case` branch from falling through to the next case without an explicit `break` or `return`. This is a common source of subtle control-flow bugs in `switch` statements.

Combined with Rule 4.1 (no `default`, use `never` assertion), this ensures `switch` exhaustiveness is doubly enforced: by the `never` assertion at the type level and by the no-fallthrough check at the syntax level.

### `useUnknownInCatchVariables: true`

Before TypeScript 4.4, `catch(e)` typed `e` as `any`. With this flag, `e` is `unknown`, forcing narrowing before use. This directly supports Rule 1.5 (no `any`) and Rule 6.2 (adapter boundaries catch and convert).

### `noPropertyAccessFromIndexSignature: true`

If a type has an index signature (`[key: string]: T`), dot notation access (`obj.knownKey`) silently returns `T` without checking that `knownKey` is a real key. With this flag, dot notation on index-signature types is a compile error; bracket notation (`obj['knownKey']`) is required, making the dynamic access explicit.

### `verbatimModuleSyntax: true`

Requires that type-only imports use `import type`. This prevents accidentally importing a value where only a type was needed, which can introduce side effects from module initialization and inflate bundle sizes.

### `isolatedModules: true`

Ensures each file can be type-checked independently without a full program view. Required for compatibility with esbuild, Babel, and SWC, which transpile TypeScript one file at a time without full type information. Also prevents constructs (like `const enum`) that cannot be transpiled without type information.

---

## Rule 9.2 — ESLint minimum rule set (Appendix B)

The ESLint config in Appendix B covers what `tsconfig` cannot enforce:

- **`@typescript-eslint/no-explicit-any`** — Catches `any` that TypeScript itself would allow (e.g., in explicit annotations where the user writes `: any`).
- **`@typescript-eslint/no-non-null-assertion`** — Catches `!` assertions that the type system would accept.
- **`@typescript-eslint/explicit-function-return-type`** — Enforces Rule 3.1 mechanically.
- **`@typescript-eslint/prefer-readonly`** — Flags mutable class properties (though Rule 1.9 forbids classes; this is belt-and-suspenders).

ESLint operates on AST patterns, which catches style violations that are type-correct but rule-violating. The combination of strict `tsconfig` and ESLint provides two independent enforcement layers.

---

## Rule 9.3 — `eslint-plugin-functional` rules

`eslint-plugin-functional` provides rules that TypeScript and `@typescript-eslint` do not cover:

| Rule | What it catches |
|------|----------------|
| `no-let` | `let` declarations (Rule 2.1) |
| `no-loop-statements` | `for`, `while`, `do..while` (Rule 4.2) |
| `no-throw-statements` | `throw` outside adapter boundary (Rule 6.2) |
| `prefer-readonly-type` | Mutable type annotations (Rule 2.2) |
| `immutable-data` | Object and array mutations (Rule 2.3) |

These rules are "SHOULD" rather than "MUST" for the ESLint config because some legitimate adapter boundary code (e.g., a `try/catch` block in an adapter) will trigger `no-throw-statements` and requires inline disable comments. The discipline is to apply the disable only where the deviation is documented.

---

## Rule 9.4 — `.editorconfig`

**Why `.editorconfig` and not just Prettier?**

Prettier handles formatting for the file types it supports. `.editorconfig` handles baseline editor behavior — indentation type, charset, line endings, trailing newlines — for *every* file type, including shell scripts, YAML, and Markdown. It is read by most editors and IDEs without plugins.

The two work together: `.editorconfig` sets the baseline; Prettier enforces formatting for code files. Neither replaces the other.

**LF line endings:**

Repositories that mix LF and CRLF line endings produce noisy diffs on cross-platform teams. LF is the canonical format for source code stored in Git. `.editorconfig` sets `end_of_line = lf` to enforce this at the editor level; `.gitattributes` (Rule 9.5) enforces it at the Git level.

---

## Rule 9.5 — `.gitattributes` for text normalization

**Why Git attributes are separate from editor config:**

`.editorconfig` governs how your editor writes files. `.gitattributes` governs how Git stores and converts line endings during checkout and commit. On Windows, Git may convert LF to CRLF on checkout by default (`core.autocrlf = true`). If `.gitattributes` does not override this for source files, a Windows developer will commit CRLF line endings even if their editor writes LF.

The combination of `.editorconfig` + `.gitattributes` ensures consistent line endings regardless of developer platform and Git configuration.

**Binary assets:**

Binary files (images, compiled artifacts, fonts) must be explicitly marked as binary in `.gitattributes` to prevent line-ending normalization from corrupting them:

```gitattributes
*.png binary
*.woff2 binary
```

---

## Rule 9.6 — Pre-commit hooks enforce lint/type gates locally

CI-only enforcement catches violations late, after context switches and often after multiple commits. Pre-commit hooks shift that feedback to the shortest possible loop: before history is written.

Practical benefits:

- Fewer broken commits in branch history.
- Smaller, cleaner PR review cycles.
- Less "fixup" noise from post-push lint/type failures.

Recommended local gate order:

1. Lint staged files (`eslint` + formatter checks).
2. Typecheck impacted package (`tsc --noEmit`).
3. Validate commit message format (Conventional Commits).

Pre-commit is not a replacement for CI. It is a first barrier; CI remains authoritative and reruns all checks in a clean environment.

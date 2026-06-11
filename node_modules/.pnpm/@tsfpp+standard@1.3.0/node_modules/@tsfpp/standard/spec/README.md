# TSF++ Specification

A strict functional TypeScript coding standard for systems where defects are expensive.

## What is the specification?

`CODING_STANDARD.md` is the normative ruleset for writing TypeScript that:
- The compiler can prove correct
- The type system can enforce total and exhaustive
- Reviewers can audit cheaply and reliably

## Structure

- **[CODING_STANDARD.md](./CODING_STANDARD.md)** — Base TSF++ rule set with all MUST, SHOULD, and MAY constraints.
- **[REACT_CODING_STANDARD.md](./REACT_CODING_STANDARD.md)** — React profile layered on top of TSF++.
- **[API_CODING_STANDARD.md](./API_CODING_STANDARD.md)** — API profile layered on top of TSF++.
- **[SECURITY_CODING_STANDARD.md](./SECURITY_CODING_STANDARD.md)** — Cross-cutting security profile for TSF++ code, APIs, and UI.
- **[DATA_CODING_STANDARD.md](./DATA_CODING_STANDARD.md)** — Data access profile layered on top of TSF++.
- **[PHILOSOPHY.md](./PHILOSOPHY.md)** — The foundational principles and design rationale behind TSF++.
- **[examples/](./examples/)** — Per-rule companion examples showing correct and incorrect patterns.
- **[rationale/](./rationale/)** — Detailed justifications for non-obvious rules, including trade-offs and alternatives considered.
- **[DEVIATIONS.md](./DEVIATIONS.md)** — Project-wide deviation ledger and template.

## Core constraints

TSF++ forbids constructs that have historically generated defects in TypeScript codebases:

- `any`, non-null assertion (`!`), and `as` outside smart-constructor boundaries
- `class`, `this`, and prototype-based inheritance
- `let`, `var`, mutable array methods, and property assignment
- `throw` outside adapter boundaries
- `for` / `while` loops and truthiness checks on non-boolean values

…and mandates replacements:

- Discriminated unions with exhaustive matching
- `Option<T>` / `Result<T, E>` for partiality and failure
- Branded types with smart constructors
- Curried, data-last combinators
- Immutable, recursive data structures

## How to read this spec

1. **New to TSF++?** Start with [PHILOSOPHY.md](./PHILOSOPHY.md) to understand the *why*. Then skim [CODING_STANDARD.md](./CODING_STANDARD.md) to get the shape of the rules.
2. **Implementing a rule?** Go to [CODING_STANDARD.md](./CODING_STANDARD.md), find your rule, then check [examples/](./examples/) for the pattern.
3. **Unsure about a rule's trade-off?** Check [rationale/](./rationale/) for the full justification.
4. **Writing a deviation?** See [DEVIATIONS.md](./DEVIATIONS.md) for the template and when deviations are appropriate.

## Versioning

The specification follows semantic versioning:

- **Major bump** — A rule is added, removed, or meaningfully tightened in a way that would require changes to existing compliant code.
- **Minor bump** — A rule is clarified, examples added, or a previously MAY constraint becomes SHOULD.
- **Patch bump** — Typos, better wording, or editorial corrections.

Adopters should treat a major bump as a migration event, not a backcompat-guaranteed release.

## Comparison with other standards

TSF++ shares principles with:

- **JSF++ (Lockheed Martin)** — The original high-assurance C++ standard. TSF++ adapts its ban on dangerous constructs to TypeScript.
- **JPL Power of Ten (Holzmann)** — Ten rules for writing reliable concurrent systems. TSF++ incorporates immutability and totality as primary defenses.
- **ML / Haskell tradition** — Algebraic data types, pattern matching, and referential transparency as language primitives, not conventions.

It complements (not replaces):

- **fp-ts** — A production functional library for TypeScript. TSF++ is a standard; fp-ts is one tool to help meet it.
- **Effect-TS** — A structured concurrency and error-handling library. Compatible with TSF++, not required.
- **@tsfpp/prelude** — Canonical TSF++ companion package for ADTs, guards, and combinators.
- **Remeda** — Recommended collection-first utility library where the prelude is intentionally silent.

## License

This specification is licensed under the MIT License. See [../LICENSE](../LICENSE).

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose rule clarifications, report edge cases, or contribute examples.

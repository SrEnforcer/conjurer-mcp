# spec/rationale/

This directory contains extended justifications for non-obvious rules in [CODING_STANDARD.md](../CODING_STANDARD.md).

The inline rationale in the standard itself is intentionally brief — one or two sentences. These files expand on the reasoning for rules that are frequently questioned, contentious, or represent a deliberate trade-off that deserves documentation.

## File naming

Files are prefixed with the section number they cover, matching the convention in `spec/examples/`:

| File | Covers |
|------|--------|
| [01-type-system.md](./01-type-system.md) | §1 — Type System (Rules 1.1–1.12) |
| [02-immutability.md](./02-immutability.md) | §2 — Immutability (Rules 2.1–2.5) |
| [03-functions.md](./03-functions.md) | §3 — Functions (Rules 3.1–3.7) |
| [04-control-flow.md](./04-control-flow.md) | §4–5 — Control Flow & Composition (Rules 4.1–5.4) |
| [06-effects.md](./06-effects.md) | §6 — Effect Management (Rules 6.1–6.6) |
| [07-naming.md](./07-naming.md) | §7 — Naming (Rule 7.7) |
| [08-totality-and-proof.md](./08-totality-and-proof.md) | §8 — Partiality, Totality, and Proof (Rules 8.1–8.4) |
| [09-tooling.md](./09-tooling.md) | §9 — Compiler and Tooling (Rules 9.1–9.6) |
| [10-documentation-and-review.md](./10-documentation-and-review.md) | §10 — Documentation and Review Protocol (Rules 10.1–10.4) |
| [11-module-organisation.md](./11-module-organisation.md) | §11 — Module Organisation (Rules 11.1–11.4) |

## When to consult these files

- You are reviewing a PR and want the full justification for a rule before marking a violation.
- You are proposing a change to a rule and need to understand what trade-offs were considered.
- You are onboarding and are not yet convinced a rule is worth the friction.

## When to update these files

If a rule is revised — its compliance level changes, an exception is added, or new evidence changes the trade-off — update the corresponding rationale file in the same PR as the change to `CODING_STANDARD.md`.

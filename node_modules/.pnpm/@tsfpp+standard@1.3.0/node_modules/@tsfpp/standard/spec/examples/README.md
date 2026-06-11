# spec/examples/

Companion code examples for [CODING_STANDARD.md](../CODING_STANDARD.md).

## Structure

One file per standard section. Each file is a valid TypeScript module — correct
patterns compile; incorrect patterns are placed in `/* BAD: ... */` block comments
so they remain readable without affecting compilation.

| File | Section |
|------|---------|
| [01-type-system.ts](./01-type-system.ts) | §1 — Rules 1.1–1.12 |
| [02-immutability.ts](./02-immutability.ts) | §2 — Rules 2.1–2.5 |
| [03-functions.ts](./03-functions.ts) | §3 — Rules 3.1–3.7 |
| [04-control-flow.ts](./04-control-flow.ts) | §4 — Rules 4.1–4.5 |
| [05-composition.ts](./05-composition.ts) | §5 — Rules 5.1–5.4 |
| [06-effects.ts](./06-effects.ts) | §6 — Rules 6.1–6.6 |
| [07-naming.ts](./07-naming.ts) | §7 — Rules 7.1–7.7 |
| [08-totality.ts](./08-totality.ts) | §8 — Rules 8.1–8.4 |
| [09-tooling.ts](./09-tooling.ts) | §9 — Rules 9.1–9.6 (focus example for Rule 9.6) |
| [10-documentation-and-review.ts](./10-documentation-and-review.ts) | §10 — Rules 10.1–10.4 |
| [11-module-organisation.ts](./11-module-organisation.ts) | §11 — Rules 11.1–11.4 |

## How to read these files

Each rule is marked with a comment header:
```
// ─── Rule N.M ───────────────────────────────────────────────────────────────
```

Correct usage follows directly as live TypeScript code.  
Incorrect usage is shown in a `/* BAD: ... */` block comment immediately after,
so the contrast is visible without the incorrect code reaching the compiler.

## How to use these as a reference

1. Find the rule number from `CODING_STANDARD.md`.
2. Open the corresponding section file.
3. Search for `Rule N.M` to jump to the relevant example.
4. For deeper justification, see [`rationale/`](../rationale/).

# Rationale: §10 — Documentation and Review Protocol

Covers Rules 10.1–10.4 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 10.1 — Exported functions require JSDoc purpose/preconditions/returns

Function signatures capture types, not operational intent. JSDoc captures contract semantics reviewers and maintainers need: what the function is for, what must hold before calling, and what callers can rely on after return.

This is especially important for pure functional APIs where behavior often depends on invariants not representable in plain TypeScript types.

---

## Rule 10.2 — Discriminated unions require module-level algebra docs

A union type defines an algebra of states. Module-level documentation explains each variant's semantic role and transition intent, so consumers interpret cases consistently.

Without this, teams converge on structural usage but diverge on meaning, producing incompatible assumptions in handlers and reducers.

---

## Rule 10.3 — Smart constructors document enforced invariants

Smart constructors are trust boundaries. They are the one place where raw input becomes branded/validated domain values. Documenting invariants makes that boundary auditable.

If invariants are undocumented, consumers cannot tell what guarantees the branded type truly provides, and reviewers cannot verify the boundary remains sound.

---

## Rule 10.4 — Code reviews enforce a shared checklist

A checklist turns style intent into repeatable process. It reduces reviewer variance and prevents high-cost omissions (unsafely introduced `any`, non-exhaustive matches, hidden mutation) from slipping into mainline code.

The checklist should be lightweight but mandatory. The goal is not bureaucracy; it is consistent defect prevention under delivery pressure.

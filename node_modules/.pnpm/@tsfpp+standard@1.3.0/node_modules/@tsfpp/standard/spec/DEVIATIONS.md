# DEVIATIONS.md — Project-Wide Deviation Ledger

Any deviation from a **MUST** rule in `CODING_STANDARD.md` that applies
project-wide (rather than to a single callsite) must be recorded here.
Callsite-scoped deviations require only an inline comment; they do not need an
entry in this file.

See §Deviation Procedure in `CODING_STANDARD.md` for the full process.

---

## How to record a deviation

Copy the template below, fill in every field, and open a PR. The PR must
include at least one reviewer approval before the deviation is considered
active.

```markdown
### DEV-NNN — Rule N.M: <Rule title>

| Field        | Value |
|--------------|-------|
| ID           | DEV-NNN |
| Rule         | N.M — <Rule title> |
| Scope        | `path/to/module/` or repo-wide |
| Status       | active \| superseded \| revoked |
| Approved by  | @handle on YYYY-MM-DD |
| Reviewed at  | YYYY-MM-DD (revisit date or "ongoing") |

**Justification**

One paragraph explaining why the rule cannot be followed in this scope. Include
any alternatives considered and why they were rejected.

**Mitigation**

How the risk introduced by the deviation is managed (e.g., additional tests,
runtime guards, wrapper boundary, code review focus).

**Revocation condition**

What would need to change for this deviation to be removed (e.g., "Once
`lib-x` ships a typed wrapper", "After the legacy module is replaced").
```

---

## Active deviations

_No active project-wide deviations at initial release._

---

## Superseded deviations

_None._

---

## Example: a well-formed deviation entry

The entry below is illustrative. It is **not** active in this repository.

---

### DEV-001 — Rule 1.4: No `interface` declarations

| Field        | Value |
|--------------|-------|
| ID           | DEV-001 |
| Rule         | 1.4 — No `interface` declarations |
| Scope        | archived legacy scope (`@tsfpp/prelude` prior to monorepo extraction) |
| Status       | superseded |
| Approved by  | @maintainer on 2026-03-01 |
| Reviewed at  | 2026-04-15 (superseded when vendor type was updated) |

**Justification**

The third-party library `lib-untyped` ships without TypeScript declarations.
The hand-authored ambient declaration file uses `interface` because the vendor
surface mixes nominal identity with structural typing, and a discriminated
union would require re-exporting the vendor's enum values — values that are
subject to change outside our control.

**Mitigation**

The declaration file is isolated behind a facade in `src/adapters/lib-untyped.ts`
that converts the vendor types to internal ADTs at the boundary (Rule 6.2).
No `interface` leaks past the adapter boundary.

**Revocation condition**

Vendor publishes official `@types/lib-untyped` with structural types compatible
with the TSF++ prelude. At that point, the hand-authored declaration is deleted
and this deviation is revoked.

---

## Inline deviation format (callsite scope)

For deviations limited to a single function or expression, record only an
inline comment. No ledger entry is required.

```typescript
// DEVIATION(1.6): `as BrandedId` is inside a smart constructor body;
// the only `as` in this module, guarded by a runtime validator above.
const make = (raw: string): BrandedId => raw as BrandedId
```

The format is: `// DEVIATION(RULE_NUMBER): <one-line justification>`.

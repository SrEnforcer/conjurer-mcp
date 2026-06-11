# Rationale — §11 Module Organisation (Rules 11.1–11.4)

See [CODING_STANDARD.md §11](../CODING_STANDARD.md#11--module-organisation) for the normative rules.

---

## Rule 11.1 — One major type per file; collocate sum type with its constructors

### The colocation argument

A discriminated union and its smart constructors form a closed algebra. The type determines what constructors can produce; the constructors enforce the invariants the type relies on. Separating them into different files breaks this contract in practice: a reader must navigate to a separate file to understand what states are constructible, and a maintainer adding a variant must touch multiple locations to keep constructors and type in sync.

Contrast with the alternative pattern where constructors live in a generic `helpers.ts` or `factories.ts` alongside unrelated utilities. The moment a new variant is added to the sum type, there is no tooling signal pointing the developer to the remote constructor file. The result is either incomplete constructors or duplicate construction logic.

### The "one type per file" limit

This is a soft structural heuristic, not a hard line count rule. The intent is:

> A reader opening a file should be able to state in one sentence what domain concept it is responsible for.

A file containing `OrgNode`, `Department`, and `Employee` fails that test. The types may be related (they belong to the same bounded context), but mixing them makes each harder to find and harder to evolve independently.

The practical exception is a tightly coupled pair — a parent type and its immediate sub-type (e.g., `ParseResult` and `ParseOk`) — where splitting adds navigation overhead with no clarity gain.

### Why not group by "layer"?

A common alternative is to put all domain types in `src/types/` or `src/models/`. This collapses well initially: the types folder stays small, and every type is in a known location. It breaks as the codebase grows:

- Constructors, validation, and type guards must live elsewhere — imports now fan out from one type to three locations.
- Every cross-cutting type change requires coordinating files in multiple directories.
- The `types/` folder accumulates types from unrelated concerns, reducing cohesion to zero.

Colocation by concept (a file owns a type and everything directly required to construct, validate, and destruct it) keeps the scope of a conceptual change within a single file and a single directory.

---

## Rule 11.2 — Maximum file length: 400 lines; 800 lines absolute maximum

### Origin: JSF++ AV Rule 1

The JSF++ Coding Standard (Lockheed Martin, 2005) defines rule AV Rule 1:

> Any one function shall not exceed 200 lines of executable code.

The TSF++ analogue applies the same bounded-complexity principle at the file level. A 400-line file that contains multiple functions, types, and tests is near the upper limit of what a developer can hold in working memory in a single review session. Beyond 800 lines, a file is almost certainly a "God module" — a symptom of a missing abstraction.

### The decomposition signal

The line limit is not an end in itself. It is a proxy for the question: "Does this file have a single, coherent responsibility?" When a file starts growing past 400 lines, the correct response is not to set a higher limit or request a deviation — it is to ask what sub-concern is trying to emerge as its own module.

Common decomposition patterns:

| Symptom | Likely decomposition |
|---------|---------------------|
| Parser file grows as grammar rules accumulate | Split `tokenizer.ts` / `combinators.ts` / `grammar.ts` |
| Domain type file accumulates helper predicates | Extract `predicates.ts` alongside the type |
| Test file grows as coverage increases | Split by scenario group (happy path / error path / edge cases) |
| Utility file accumulates unrelated helpers | Extract per-concern utilities; delete the catch-all |

### Deviation procedure

If a file legitimately exceeds 400 lines (e.g., a generated file, a specification-driven mapping table), record a deviation:

```typescript
// DEVIATION(11.2): This file contains the full Unicode block mapping table (870 lines).
// Splitting it would fragment a single cohesive lookup structure.
// Approved by: <name>, <date>
```

The 800-line limit is absolute; no deviation may exceed it.

---

## Rule 11.3 — Organise by feature/domain, not by technical role

### The Conway's Law argument

Conway's Law states that a system's structure mirrors the communication structure of the team that built it. The inverse is also true: the directory structure shapes how developers think about the system and which changes feel "local" vs "cross-cutting."

A **role-first** structure (`src/types/`, `src/functions/`, `src/tests/`) groups code by what it *is*. It answers the question "where are all the types?" — which is rarely the question a developer is asking. The question is almost always "where is everything related to X?"

A **domain-first** structure (`src/lexer/`, `src/parser/`, `src/resolver/`) groups code by what it *does*. Adding a new feature, fixing a bug in a bounded context, or onboarding a new developer to a subsystem are all local operations: open the directory, understand what it contains, make the change.

### The change-locality principle

A directory structure is good if most changes touch at most one directory. Measure this empirically: look at the last 20 commits and count how many directories each touched.

With role-first organisation, a typical feature addition requires:
- Adding a type in `src/types/`
- Adding a function in `src/functions/` or `src/services/`
- Adding a test in `src/tests/` or `src/__tests__/`

Three directories for one conceptual change. With domain-first, all three files live under `src/feature-name/`.

### "But I need to find all types"

The concern that motivates role-first structure — "I want to see all types in one place" — is better addressed by tooling (TypeScript language server, module graph tools, documentation generators) than by directory layout. A `grep` for `^type ` or a documentation index answers the "all types" question without penalising the day-to-day workflow of feature development.

### Cross-cutting concerns

Some code genuinely does not belong to a single domain: logging infrastructure, shared branded-type primitives, generic `Option`/`Result` utilities. These live in a top-level `shared/` or `prelude/` directory — not in a `types/` or `utils/` catch-all, but in a deliberately named module that signals "this is a reusable building block."

```
src/
  shared/
    option.ts          ← Option<A> type + combinators
    result.ts          ← Result<T, E> type + combinators
    brand.ts           ← Brand<T, B> utility type
  org-tree/
    OrgNode.ts
    OrgTree.ts
    render.ts
    index.ts
  parser/
    tokenize.ts
    grammar.ts
    parse.ts
    index.ts
```

The key test: can a developer describe in one sentence what belongs in a directory and what does not? If not, the directory is likely a catch-all.

---

## Rule 11.4 — Barrel `index.ts`; no direct internal imports

### The stability argument

A barrel `index.ts` is the published surface of a module. Internal files are implementation details. When a consumer imports directly from an internal file:

```typescript
import { mkPerson } from '../org-tree/OrgNode'   // direct internal import
```

they are coupling to the current file layout. If `OrgNode.ts` is split into `OrgNode.ts` + `OrgNodeConstructors.ts` for size reasons, every direct import breaks. The barrel absorbs that refactoring invisibly:

```typescript
import { mkPerson } from '../org-tree'   // barrel import — survives reorganisation
```

### Tree-shaking consideration

Barrel files can inhibit tree-shaking in bundlers that do not support module-level dead-code elimination. This is a real tradeoff. The mitigation:

1. Use bundlers and TypeScript configurations that support `"moduleResolution": "bundler"` or `"node16"` with ESM, which enables per-export tree-shaking through barrel files.
2. In library code (`@tsfpp/prelude`), prefer named sub-path exports (`@tsfpp/prelude/option`) over a single monolithic barrel when the package is large enough to make tree-shaking observable.
3. In application code (not published as a library), the tree-shaking concern is generally outweighed by the stability and discoverability benefits of a barrel.

### Enforcing the boundary

The `no-restricted-imports` ESLint rule can enforce barrel-only imports in CI:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": ["../*/[A-Z]*", "../*/*.ts"]
    }]
  }
}
```

This flags any import that bypasses a barrel by referencing a PascalCase file directly or a `.ts` extension explicitly.

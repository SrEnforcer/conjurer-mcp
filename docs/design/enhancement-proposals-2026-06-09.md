# Enhancement Proposals — 2026-06-09

Rated on four axes, each 1–5:
- **Elegance** — conceptual cleanness; leverages existing structure without duplication
- **Expressiveness** — how much richer the agent's view of the design becomes
- **Utility** — practical day-to-day value for a solo interactive workflow
- **Difficulty** — implementation effort (higher = harder)

---

## Short-term

- [x] **#4 Intent topology validation** — recover `:requires`/`:deferred`/`:manifest` consistency checks into `validate_cnj`
  - Elegance 5 · Expressiveness 5 · Utility 5 · Difficulty 2
  - Status: implemented in `validation.ts` + `cnj-model.ts` (`domainForms`)

- [x] **#5 MCP Grimoire Resources** — expose `conjurer://grimoire/{name}` as protocol resources alongside tools
  - Elegance 5 · Expressiveness 5 · Utility 3 · Difficulty 1
  - Status: implemented in `resources.ts`, wired in `server.ts`

- [x] **#3 `check_symbol_coverage`** — set-intersection of a .cnj's referenced symbols against index.edn, grouped by grimoire
  - Elegance 5 · Expressiveness 4 · Utility 4 · Difficulty 1
  - Status: implemented in `tools/retrieval.ts` (`handleCoverage`)

## Medium-term

- [x] **#1 Workspace state** — process-local stateful graph enabling real `resolve` and `evaluate`
  - Elegance 4 · Expressiveness 5 · Utility 5 · Difficulty 4
  - Status: implemented in `workspace-state.ts` (shared-core); `tools/project.ts` rewritten with real logic

- [x] **#2 `lens_dependency_graph`** — expose the workspace dependency graph as a first-class queryable tool
  - Elegance 5 · Expressiveness 5 · Utility 4 · Difficulty 2
  - Prerequisite: workspace state ✅
  - Status: implemented in `tools/project.ts` (`handleLensDependencyGraph`); 8 tests added

## Long-term / speculative

- [x] **#6 `diff_cnj`** — semantic diff between two .cnj versions (decisions added/removed, goals changed, targets added)
  - Elegance 5 · Expressiveness 5 · Utility 3 · Difficulty 3
  - Status: implemented in `tools/diff.ts` (`handleDiffCnj`, `registerDiffTools`); 14 tests added

- [ ] **#7 `:assert` section** — machine-checkable design invariant declarations in the .cnj itself
  - Elegance 5 · Expressiveness 5 · Utility 3 · Difficulty 5
  - Requires spec-level coordination

## Deferred / out of scope for v1

- [x] **`trace_symbol`** — reverse index: which .cnj files reference a given Conjurer symbol
  - Elegance 5 · Expressiveness 4 · Utility 3 · Difficulty 2
  - Status: implemented in `tools/retrieval.ts` (`handleTraceSymbol`); 9 tests added

- [ ] **`explain_form`** — structured explanation of what a specific form does (spec symbols, constraints, dependencies)
  - Elegance 4 · Expressiveness 5 · Utility 5 · Difficulty 3
  - Derived from legacy `explain-selection.ts`

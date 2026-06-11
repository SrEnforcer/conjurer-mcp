# Enhancement Proposals — Wave 2
_Generated: 2026-06-09 09:42_

## Context from live server analysis

```
tools live:        16  (7 retrieval · 3 parse · 1 validate · 5 project)
symbol coverage:   1%  (2 of 134 index symbols referenced in mcp-server.cnj)
grimoires unused:  agent · data · domain · eloquence · exhume
                   orchestrate · reasoning · semantics · taxonomy · web
workspace health:  valid · 0 violations · 0 unresolved deps · no cycles
```

Scoring: **Elegance / Expressiveness / Utility / Difficulty** each 1–10
(Difficulty: higher = harder)  
**Score** = (E + X + U) / 3 / D × 10  — value per effort ratio

---

## Tier 1 — Immediate (low difficulty, high value)

- [x] **`lens_open_questions`** — aggregate all open questions across workspace, sorted by file; cross-file open question inventory in one call
  - Elegance: 8 · Expressiveness: 7 · Utility: 8 · Difficulty: 2
  - Score: **7.8**
  - Status: implemented in `tools/project.ts` (`handleLensOpenQuestions`); 7 tests

- [ ] **`lens_charter_timeline`** — all decisions across workspace sorted chronologically; makes the cross-file decision history queryable
  - Elegance: 9 · Expressiveness: 8 · Utility: 8 · Difficulty: 2
  - Score: **8.3**
  - Backed by: workspace-state; decisions have `:date` fields — sort and flatten
  - Output: `{ decisions: [{ date, decision, file, title }] }`

- [~] **`lint_module_sizes`** — ~~check declared `:est-lines` against TSF++ limit~~
  - **Rejected**: bakes a TSF++ dependency into client software; the 400-line limit is an internal standard, not universal

## Tier 2 — Short-term (moderate difficulty, high value)

- [x] **`workspace_summary`** — aggregate overview of a workspace in one call
  - Elegance: 8 · Expressiveness: 9 · Utility: 9 · Difficulty: 3
  - Score: **8.7**
  - Status: implemented in `tools/project.ts` (`handleWorkspaceSummary`); 9 tests; coverage_pct omitted by design (cross-cluster seam)

- [ ] **`decisions_audit`** — cross-file: collect all decisions, check date monotonicity (append-only), flag missing `:date` or `:decision` keys, surface decisions with identical dates as suspected duplicates
  - Elegance: 8 · Expressiveness: 7 · Utility: 8 · Difficulty: 3
  - Score: **7.7**
  - Backed by: workspace-state + cnj-model; extends validate_cnj's append-only check to workspace scope
  - Output: `{ issues: [{ severity, file, date, message }], total_decisions, earliest, latest }`

- [ ] **`check_target_health`** — for each target in the workspace, verify: declared `:modules` exist on disk; actual line counts vs `:est-lines`; `:from` references resolve to real targets; flags approaching/exceeding TSF++ limits
  - Elegance: 8 · Expressiveness: 8 · Utility: 9 · Difficulty: 4
  - Score: **7.3**
  - Backed by: workspace-state + fs stat; bridges the design ↔ reality gap explicitly
  - Output: `{ targets: [{ name, modules: [{ path, est_lines, actual_lines?, status }] }] }`
  - Note: `actual_lines` requires reading and line-counting real TypeScript files — honest about "not found" vs "found but uncounted"

## Tier 3 — Medium-term (higher difficulty, very high value)

- [x] **`explain_form`** — given a .cnj form by name, return a rich contextual explanation: form type, each Conjurer symbol it references (with synopsis + known flag), and applicable validation rules
  - Elegance: 9 · Expressiveness: 10 · Utility: 10 · Difficulty: 5
  - Score: **7.7**
  - Status: implemented in `tools/retrieval.ts` (`handleExplainForm`); 11 tests; uses `findFormNode` + `collectSymbolRefs` + index lookup

- [ ] **`trace_decision`** — given a target or form name, find decisions in the charter that mention it (heuristic: text search over decision bodies); produces a provenance chain "why was this designed this way"
  - Elegance: 7 · Expressiveness: 9 · Utility: 8 · Difficulty: 5
  - Score: **6.4**
  - Backed by: workspace-state + cnj-model; heuristic text match — honest about approximation
  - Output: `{ form, decisions_referencing: [{ file, date, excerpt }] }`

- [ ] **`recommend_symbols`** — given a free-text description of what a form should do, return the most relevant Conjurer symbols from the index (keyword expansion over synopses + key-params; not semantic search)
  - Elegance: 7 · Expressiveness: 8 · Utility: 8 · Difficulty: 5
  - Score: **6.1**
  - Backed by: symbol-index; extends search_symbols with multi-term scoring and ranked output
  - Output: `{ query, recommendations: [{ symbol, grimoire, synopsis, relevance_score }] }`
  - Note: honest about being keyword-based, not semantic — label as "keyword recommendations" not "semantic match"

## Tier 4 — Long-term / speculative

- [ ] **`generate_cnj_stub`** — given a project name, goals, and target names, generate a minimal valid .cnj scaffold as a string (deterministic template-fill, not LLM generation)
  - Elegance: 6 · Expressiveness: 8 · Utility: 8 · Difficulty: 5
  - Score: **5.9**
  - Note: purely template-based (no LLM); honesty constraint — label output as "scaffold, not authored"

- [ ] **`compare_workspace_revisions`** — diff the workspace at two git SHAs using `diff_cnj` across all discovered files; requires git shell integration
  - Elegance: 7 · Expressiveness: 9 · Utility: 7 · Difficulty: 7
  - Score: **4.9**

- [ ] **`#7 :assert section`** — machine-checkable design invariant declarations (spec-level coordination required)
  - Elegance: 10 · Expressiveness: 10 · Utility: 8 · Difficulty: 10
  - Score: **3.7**
  - Blocked on: Conjurer spec extension

## MCP protocol enhancements

- [ ] **`conjurer://workspace/{file}` resources** — expose workspace snapshots as MCP resources (listable, addressable) alongside the existing `conjurer://grimoire/{name}` resources
  - Elegance: 9 · Expressiveness: 7 · Utility: 6 · Difficulty: 3
  - Score: **7.3**

- [ ] **`invalidate_evaluate_cache`** — explicit cache flush for the process-local evaluate cache; useful when files change outside the server's knowledge
  - Elegance: 6 · Expressiveness: 3 · Utility: 6 · Difficulty: 1
  - Score: **5.0**
  - Note: low elegance — the cache should self-invalidate via context keys; this is a diagnostic escape hatch

---

## Priority order

| Rank | Tool | Score | Difficulty | Status |
|------|------|-------|------------|--------|
| 1 | `lint_module_sizes` | 8.8 | 2 | ☐ next |
| 2 | `workspace_summary` | 8.7 | 3 | ☐ |
| 3 | `lens_charter_timeline` | 8.3 | 2 | ☐ |
| 4 | `lens_open_questions` | 7.8 | 2 | ☐ |
| 5 | `decisions_audit` | 7.7 | 3 | ☐ |
| 6 | `explain_form` | 7.7 | 5 | ☐ |
| 7 | `check_target_health` | 7.3 | 4 | ☐ |
| 8 | `conjurer://workspace` resources | 7.3 | 3 | ☐ |
| 9 | `trace_decision` | 6.4 | 5 | ☐ |
| 10 | `recommend_symbols` | 6.1 | 5 | ☐ |
| 11 | `generate_cnj_stub` | 5.9 | 5 | ☐ |
| 12 | `invalidate_evaluate_cache` | 5.0 | 1 | ☐ |
| 13 | `compare_workspace_revisions` | 4.9 | 7 | ☐ |
| 14 | `:assert section` | 3.7 | 10 | ☐ blocked |

## Completed (wave 1, 2026-06-09)

See [enhancement-proposals-2026-06-09.md](enhancement-proposals-2026-06-09.md)

- [x] `check_symbol_coverage` — Cluster A retrieval (coverage density)
- [x] Grimoire resources (`conjurer://grimoire/{name}`)
- [x] Intent topology validation (`validate_cnj` rules a/b/c)
- [x] Workspace state (`workspace-state.ts` + real resolve/evaluate)
- [x] `lens_dependency_graph` — Cluster D (queryable target DAG)
- [x] `trace_symbol` — Cluster A (reverse symbol lookup)
- [x] `diff_cnj` — Cluster B (semantic .cnj diff)

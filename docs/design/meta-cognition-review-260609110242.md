# Meta-Cognition Review — conjurer-mcp
_Generated: 2026-06-09 11:02 using Conjurer reasoning / semantics / agent constructs_

This document applies Conjurer's own meta-cognitive primitives as analytical lenses
against the MCP server codebase. Each section names the construct it embodies.

---

## `witness` — Transparent Observation

Observed state without advocacy or modification.

```
Module              Lines   Est-lines (design)   Status
-----------         -----   ------------------   ------
tools/project.ts     410          340            VIOLATION — 10 over 400-line ceiling
tools/retrieval.ts   305          360            Under; est-lines overstated by 55
tools/diff.ts        151          160            OK
tools/parse.ts       138             —           OK
shared-core/
  workspace-state.ts 158             —           OK
  validation.ts       98             —           OK

Total tools registered: 18
  Cluster A retrieval:    7  (lookup, search, grimoire, examples, list, coverage, trace_symbol,
                               explain_form)
  Cluster B parse:        2  (parse_cnj, read_charter)
  Cluster C validate:     1  (validate_cnj)
  Cluster D project:      5  (resolve, evaluate, preflight, lint_topology, lens_dependency_graph)
  Lens tools:             2  (workspace_summary, lens_open_questions)
  Diff tools:             1  (diff_cnj)

Protocol checks:
  stdout writes:          0  (grep found none — protocol integrity confirmed)
  stderr logging only:    confirmed via logging.ts
  
Design:
  Symbol coverage in mcp-server.cnj:  ~1% (2 of 134 symbols)
  Grimoires not referenced in design: agent · data · domain · eloquence · exhume
                                       orchestrate · reasoning · semantics · taxonomy · web
  evaluate artifact field:            always {} — never populated
```

---

## `r/contradict` — Internal Contradiction Search

Searching for design claims that cannot both be true simultaneously.

**Contradiction 1: "deterministic server" vs. mutable process-local state**
- Claim (charter): "fully deterministic — no LLM, no ambient state"
- Reality: `evaluateCache` is a `Map<string, {...}>` allocated at module level in
  `tools/project.ts:23`. It persists across tool calls within a process lifetime.
- Verdict: Correctly documented as a decision (deviation for performance), but the
  charter claim "deterministic" should be qualified: the *retrieval and parsing* tools
  are deterministic; the *evaluate* tool has a statefulness side-channel.
- Resolution: Add `deterministic_tools` and `stateful_tools` to the charter's
  `:outputs` section, or refine the claim in `conjurer-mcp.cnj` to
  "deterministic over inputs given fixed spec — evaluate adds session-local cache."

**Contradiction 2: "preferred 400-line modules" vs. `tools/project.ts` at 410 lines**
- Claim (CLAUDE.md, TSF++ asset): 400 lines preferred; 800 is the hard max, allowed
  only with an explicit documented deviation.
- Reality: `tools/project.ts` is at 410 lines — past the soft limit, but well within
  the deviation-allowed range. Not a hard violation, but the trajectory matters: adding
  `lens_charter_timeline` here would push it to ~460 lines, and `decisions_audit` to
  ~530 — approaching the zone where a split is clearly the right call.
- Verdict: No immediate action required, but a split now (`tools/lenses.ts`) is
  inexpensive and prevents accumulating technical debt before the hard ceiling matters.
- The design est-lines (340) is wrong regardless — update to 410.

**Contradiction 3: `explain_form` claims design-backed rules but uses a disconnected dict**
- Claim (decision in mcp-server.cnj): "`explain_form` backed-by cnj-model + validation"
- Reality: `VALIDATION_RULES_BY_FORM` in `retrieval.ts:162–166` is a hardcoded static
  string array, copied from `validation.ts` logic. It does **not** call `validateCnj`.
- Verdict: The backing claim is false — there is no live link. If `validation.ts` gains
  a new rule, `explain_form` silently returns stale rules.
- Resolution: Either (a) derive rules by calling `validateCnj` on a stub document and
  filtering violations by form type, or (b) export the rule descriptions from
  `validation.ts` itself as an introspectable map.

**Contradiction 4: Symmetry claim in `diff_cnj` vs. key-order sensitivity**
- Claim (design): "semantic diff — not line-level diff"
- Reality: `decisionFingerprint` uses `JSON.stringify({date, decision, rationale})`
  over a reconstituted map. If the EDN parser preserves insertion order and two
  documents write the same decision with different key orderings, they would fingerprint
  differently and be reported as a deletion + addition rather than unchanged.
- Verdict: EDN maps are unordered; the parser may or may not preserve write order.
  This is a latent false-positive source.
- Resolution: Sort keys before fingerprinting: `JSON.stringify({date:..., decision:...,
  rationale:...})` with explicit key ordering (as the function already does) — but
  verify the EDN parser actually normalises map entry order before relying on this.

---

## `r/check` — Claim Verification

Verifying specific logical claims made in the design against observed reality.

| Claim | Source | Observed | Status |
|-------|--------|----------|--------|
| "tools/project.ts est-lines 340" | mcp-server.cnj | 410 lines | ❌ False |
| "tools/retrieval.ts est-lines 360" | mcp-server.cnj | 305 lines | ❌ Overstated by 55 |
| "never write to stdout" | CLAUDE.md | 0 console/stdout found | ✓ |
| "evaluate artifact field populated" | implied by tool name | artifact: {} always | ❌ Empty |
| "explain_form backed by validation.ts" | mcp-server.cnj decision | hardcoded dict | ❌ Disconnected |
| "workspace_summary covers all files" | tool intent | only files reachable via :references BFS | ⚠ Scoped, not documented |
| "tests 158/158 passing" | CLAUDE.md baseline | not re-verified this session | ⚠ Unverified |

**Unverified — should be re-checked:**
Run `pnpm test` before the next feature addition to confirm the baseline still holds
after the linter-driven changes to retrieval.ts and project.ts.

---

## `r/hypothesise` — Abductive Reasoning over Observed Gaps

**Observation: Symbol coverage is ~1% (2 of 134 index symbols used in design files)**

Ranked candidate explanations:

1. **(Most plausible) Domain mismatch**: Conjurer's 134 symbols are directives for
   driving AI-assisted generation (`conjure`, `materialise`, `refine`, `r/check`…).
   They are consumed by the IDE agent at session time, not embedded in `.cnj`
   design-time declarations. A project that *uses* Conjurer to design itself will
   always have low symbol density in its `.cnj` files — the symbols live in the
   session, not the artifact.

2. **(Plausible) Extraction blind spot**: `visitNode` in `edn-parser.ts` collects
   symbols that (a) appear in head position of a list, or (b) contain '/'. Bare
   symbol values in keyword arguments (`:backed-by [target asset]`) are not collected
   unless they contain '/'. If design files use unqualified form-type names as values,
   they would be under-counted.

3. **(Less plausible) Design under-specification**: The design files simply haven't been
   authored to be rich in Conjurer symbol references. Adding more `:evidence`,
   `:backed-by`, and `:rationale` clauses with qualified Conjurer symbols (e.g.,
   `r/check`, `s/critique`) would increase coverage.

**Implication of Hypothesis 1**: The `check_symbol_coverage` tool is measuring the
wrong thing for self-describing meta-projects. For user projects, coverage would be
higher because users actively reference Conjurer symbols in their forms. This tool
is most valuable for those external users, not for auditing conjurer-mcp.cnj itself.

---

## `a/reflect` — Agent Self-Examination of Assumptions

What the implementation assumed that may not hold:

**Assumption 1: Charter `:references` chains are the complete workspace topology**
- What holds: For well-authored workspaces, `:references` links all design files.
- What may not hold: If an author forgets to add a `:references` entry, the missing
  file is silently excluded from all workspace-scanning tools (`workspace_summary`,
  `lens_open_questions`, `trace_symbol`, `lens_dependency_graph`).
- Current behavior: `buildWorkspaceSnapshot` with a single-file entry returns a
  workspace of one; no diagnostic is emitted to the caller.
- Risk: A user calls `workspace_summary` on `conjurer-mcp.cnj`, gets 1 file back,
  and concludes "that's my whole workspace" — without knowing that 4 other files exist
  but aren't linked.
- Fix: Add `"scope_note": "workspace derived from :references chains; files not
  reachable from entry are excluded"` to every workspace-scanning tool response.

**Assumption 2: `findFormNode` matches by second element being the form name**
- What holds: For standard forms `(charter "Name" ...)` and `(target "name" ...)`.
- What may not hold: If a spell name contains a hyphen (`materialise-preflight`) but
  the caller passes the tool name (`materialise_preflight`), `findFormNode` returns
  `undefined` and the tool reports "not found". The `explain_form` docs don't clarify
  which naming convention to use.
- Risk: Users call `explain_form` on a spell and get "not found" when using underscore
  names (as in the MCP tool surface) rather than hyphen names (as in .cnj forms).
- Fix: Normalize the query by replacing underscores with hyphens before searching,
  or document the name convention explicitly in the tool description.

**Assumption 3: `evaluateCache` key collisions won't occur across unrelated files**
- The cache key is a SHA-256 over all file contents (from `buildWorkspaceSnapshot`).
  Probability of collision is cryptographically negligible. Assumption is sound.

**Assumption 4: `diff_cnj` charter fields always exist on both documents**
- `diffCharter` accesses `a.doc.charter` and `b.doc.charter` directly. If either
  .cnj file fails to parse a charter (malformed or charter-absent), the calling code
  would propagate an error before reaching `diffCharter`. Assumption holds given the
  `readDoc` guard, but the error path from `readDoc` returning Err should be tested
  explicitly.

---

## `s/critique` — Systematic Weakness Identification

Structural weaknesses, not point bugs:

**W1 — Module approaching split threshold (advisory, TypeScript files only)**
`tools/project.ts` at 410 lines is past the 400-line soft limit for `.ts` files, but
within the 800-line deviation-allowed range (documented deviation required 400–800).
Not a hard violation. However, the next two lens additions (`lens_charter_timeline`,
`decisions_audit`) would push it to ~520 lines — past the point where a documented
deviation comment is expected. Proactive split into `tools/lenses.ts` is low-cost now
and avoids a more disruptive split later. This limit does not apply to `.md` or `.js`
files.

**W2 — Validation coupling is implicit and untested**
`VALIDATION_RULES_BY_FORM` in `retrieval.ts` is a copy of information that lives in
`validation.ts`. The link between them is a comment and a developer convention.
There are no tests that verify the two stay in sync. This is silent tech debt.

**W3 — Two BFS implementations that should be one**
`buildWorkspaceSnapshot` (workspace-state.ts) performs BFS over `:references`.
`reachableFrom` in `project.ts` performs a separate graph walk for dependency
subgraph filtering. Both traverse the same structure with different logic. The
shared-core package should export a single traversal primitive.

**W4 — `evaluate` misleads on artifact**
The tool is named `evaluate` (implying assessment) and returns an `artifact: {}`
field, implying a computed output. Neither claim holds — it only manages a cache key.
Callers probing `artifact` will get an empty object with no explanation. This is the
worst kind of API opacity: it looks functional but is silent.

**W5 — Missing form types in `explain_form`**
`VALIDATION_RULES_BY_FORM` has entries for `charter`, `target`, `asset`, `spell`
only. Forms `context`, `assume`, `handover`, `ritual`, `domain` return `[]` rules
silently, with no "unknown form type" indicator in the response.

**W6 — `workspace_summary` valid/invalid flags are noisy**
`validateCnj` is called in `:authored` mode for every file. Files that are valid
structurally may have `violations: 1` due to strict charter rules. The tool reports
`valid: false` which is alarming to callers who haven't seen the violation detail.
Consider: surface `violation_summary: [{ rule, severity }]` so callers can judge
severity without re-querying.

**W7 — No discovery without a known entry file**
Every workspace tool requires an entry `.cnj` file path. If a user has a folder of
`.cnj` files and doesn't know which is the "entry" file (the one with `:references`),
there is no tool to discover it. `materialise_preflight` handles folder → file mapping
for a known project, but only by name-matching against `conjurer-mcp.cnj` by default.

---

## `r/analogise` — Transfer from Similar Systems

**Analogy: LSP servers (typescript-language-server, rust-analyzer)**
- LSPs rebuild their workspace model on file change events, not per-request.
- Our server rebuilds from disk on every tool call.
- Teaches: For interactive IDE use (vscode-extension), per-call rebuilds will feel
  slow for large workspaces. The current design is correct for batch/agent use;
  for interactive use, a file-watching daemon model would be preferred.
- Decision to document: "Current design is request-driven, not event-driven. Correct
  for agent use; revisit before building real-time hover/codelens in vscode-extension."

**Analogy: SQL query EXPLAIN / EXPLAIN ANALYZE**
- `EXPLAIN` shows the plan (like our `resolve`).
- `EXPLAIN ANALYZE` executes and measures (like our `evaluate` should).
- Our `evaluate` currently only does EXPLAIN (cache key + stale check) but carries
  the misleading name of EXPLAIN ANALYZE.
- Teaches: Rename to `query_cache_status` or `check_evaluate_cache`, OR implement
  real plan analysis (count unresolved, flag missing modules on disk, etc.).

**Analogy: `git blame` / provenance tracing**
- `git blame` answers "which commit last touched this line?"
- Our pending `trace_decision` answers "which charter decisions mention this form?"
- The analogy confirms: `trace_decision` has a well-understood precedent; the
  challenge is that decision bodies are free text, so matching will be heuristic.
- Teaches: Be explicit in the tool description about heuristic matching, same as
  `git blame` is explicit that it shows "last writer" not "author of the concept."

**Analogy: tree-sitter query language**
- tree-sitter lets you query AST nodes by structural pattern.
- Our `explain_form` finds a form by name — a simple structural query.
- Teaches: A query-over-forms primitive (e.g., "find all forms of type `spell` with
  `:requires` containing `X`") would be more powerful. This is the germ of a
  pattern-query tool. For now, `explain_form` is the seed.

---

## `meta-query` — Interrogating Design Assumptions

**Q: Why is the evaluate cache process-local?**
- Assumption: single user, single agent, single process lifetime.
- Failure mode: VS Code extension opens two windows on the same workspace, both
  spawning separate MCP server processes. The cache in each process diverges.
- Implication: The cache is a performance hint, not a consistency guarantee. It is
  currently correct only because MCP stdio spawns one process per client.
- Note this in the evaluate tool description: "cache is process-local and not
  shared across concurrent server instances."

**Q: Why does workspace-state use declaration-based (`:references`) discovery rather
than filesystem scanning?**
- Declaration-based: author controls exactly which files are in scope. Predictable,
  composable, explicit. Correct for design-time use.
- Filesystem-based: discovers everything in a folder. Correct for `materialise_preflight`.
- Both are implemented and available. The gap: no tool explains to the caller *which
  mode was used* and *what was excluded as a result*.

**Q: Why is `explain_form` in `retrieval.ts` rather than `parse.ts`?**
- It bridges retrieval (index lookup) and parsing (file read).
- The primary value delivered is "which Conjurer symbols does this form use" — that
  is a retrieval/index operation. Placement in retrieval.ts is coherent.
- But `retrieval.ts` now handles pure-index operations, workspace-scanning operations,
  AND form explanation. These are three distinct concerns. The coherence is breaking down.

**Q: What happens when the Conjurer spec is missing at startup?**
- The server builds an empty `SpecReader`. Index building fails; `SymbolIndex` is
  empty. `lookup_symbol`, `search_symbols`, `check_symbol_coverage`, `explain_form`,
  `trace_symbol` all return "not found" or empty results.
- There is no startup warning, no degraded-mode indicator in tool responses.
- Recommendation: At startup, log to stderr whether the spec was found and the index
  size. In tool responses, add `"spec_available": true/false` when the answer depends
  on the spec being present.

---

## `refine` — Iterative Enhancement Without Starting Over

Ordered refinements by impact-per-effort:

**Refine 1 — Extract `tools/lenses.ts` (recommended before `lens_charter_timeline`)**
- Move `handleLensOpenQuestions`, `handleWorkspaceSummary`, `handleLensDependencyGraph`
  from `tools/project.ts` into a new `tools/lenses.ts`.
- `tools/project.ts` drops from 410 to ~250 lines, with clear `resolve`/`evaluate`/
  `preflight`/`lint_topology` responsibility.
- `tools/lenses.ts` starts at ~160 lines with room for `lens_charter_timeline`,
  `decisions_audit`, and future lenses — each ~50 lines — before approaching the soft limit.
- This is a mechanical split, not a redesign. No logic changes.

**Refine 2 — Make `explain_form` rules live (correctness)**
- Replace `VALIDATION_RULES_BY_FORM` static dict with a call to `validateCnj` on a
  minimal document containing only the queried form.
- Export `ruleDescriptions: ReadonlyMap<string, string>` from `validation.ts` —
  one line per rule, usable as a lookup table in `explain_form`.
- This removes the drift risk without adding performance cost.

**Refine 3 — Clarify `evaluate` output (honesty)**
- Add `"artifact_note": "artifact field is intentionally empty — generation belongs to
  the IDE agent, not the server"` to all `evaluate` responses.
- OR rename `artifact` to `cache_entry` with only `cache_key` and `evaluated_at`.
- Either makes the protocol honest without a breaking change.

**Refine 4 — Surface workspace scope in scanning tools (discoverability)**
- Add `"scope": { "method": "references_bfs", "files_discovered": N,
  "entry": "/path/to/entry.cnj", "note": "files not reachable via :references
  are excluded" }` to responses from workspace_summary, lens_open_questions,
  trace_symbol, lens_dependency_graph.
- Callers can then distinguish "this workspace genuinely has 1 file" from
  "this entry file has no :references and we only saw 1 file."

**Refine 5 — Normalise form name lookup in `explain_form`**
- Before calling `findFormNode`, replace `_` with `-` in the input `name`.
- Add to the tool description: "use the form's .cnj name, e.g. `materialise-preflight`,
  not the MCP tool name `materialise_preflight`."

**Refine 6 — Complete `VALIDATION_RULES_BY_FORM` for all known form types**
```
context: ['context must have a :scope and :description'],
assume: [':condition must be a non-empty string'],
handover: [':to must reference a known target'],
ritual: ['ritual steps must be an ordered list'],
```
Low effort, closes the silent gap for these form types.

---

## `ensure` — Missing Postconditions

Postconditions that should be enforced but currently are not:

1. **`tools/project.ts` stays under 400 lines**: Enforce via the module-size check or
   add a CI step that `wc -l tools/project.ts | awk '{if($1>400) exit 1}'` before merge.

2. **`explain_form` rules stay in sync with `validation.ts`**: Enforce by deriving, not
   copying (see Refine 2 above). Until then: add a test that calls both
   `validateCnj` on a charter violation and checks that `explain_form` lists the
   same rule string.

3. **All workspace-scanning tools surface their scope**: Callers must not silently see
   a partial workspace. Add `scope` metadata to every workspace tool response (Refine 4).

4. **`evaluate` is never mistaken for a generative tool**: The `artifact: {}` field
   must either be populated or carry an explicit note (Refine 3). An empty object
   with no explanation violates the "honest about what cannot be resolved" principle.

5. **Test baseline remains green after every module split**: After extracting
   `tools/lenses.ts`, run `pnpm test` before committing. The linter may add new
   imports or deviation comments; verify the suite before marking done.

---

## Summary: Prioritised Action List

| Priority | Finding | Construct | Action |
|----------|---------|-----------|--------|
| P1 | `tools/project.ts` at 410 lines — past soft limit, next features will compound | `r/contradict`, `witness` | Extract `tools/lenses.ts` before adding 2+ more lens tools |
| P1 | `explain_form` rules disconnected from `validation.ts` | `r/contradict`, `s/critique` | Export rule descriptions from validation; derive in explain_form |
| P2 | `evaluate artifact: {}` misleads callers | `r/check`, `s/critique` | Add `artifact_note` or rename field |
| P2 | Workspace scope not surfaced in scan tools | `a/reflect`, `refine` | Add `scope` metadata to all workspace tool responses |
| P2 | `explain_form` underscore vs. hyphen name mismatch | `a/reflect` | Normalise `_` → `-` in findFormNode lookup |
| P3 | Missing form types in `VALIDATION_RULES_BY_FORM` | `s/critique` | Add context, assume, handover, ritual entries |
| P3 | Design est-lines outdated (`project.ts` says 340, is 410) | `r/check` | Update mcp-server.cnj module table |
| P3 | No spec-availability signal in tool responses | `meta-query` | Add `spec_available` flag to spec-dependent tools |
| P3 | `evaluateCache` not documented as process-local | `meta-query` | Add note to tool description and charter |

### New tool ideas surfaced by this analysis

- **`list_forms`** — list all top-level forms in a .cnj file with their type and name; complements `explain_form`; routes to `parse.ts`
- **`find_cnj_files`** — given a directory, discover all .cnj files (filesystem scan, not reference-based); complements `materialise_preflight`
- **`check_design_consistency`** — `r/check`-inspired: verify that every module declared in `:modules` has a corresponding file, that `:est-lines` fields are plausible, that `:from` chains are acyclic
- **`summarise_decisions`** — `r/synthesise`-inspired: given a workspace, group decisions by theme (heuristic keyword clustering, no LLM); bridges `decisions_audit` and `lens_charter_timeline`

See [enhancement-proposals-260609094219.md](enhancement-proposals-260609094219.md) for the full wave 2 backlog.

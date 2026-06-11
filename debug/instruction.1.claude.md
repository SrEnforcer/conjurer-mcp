# Conjurer-MCP — bug & gap briefing for the in-IDE agent

These findings were read from two runtime outputs the built server produced:
`execution-results.json` (the `execute`-style charter pass over the 5 .cnj files)
and `materialise-preflight.json` (the `materialise_plan` preflight pass).

**Important — attested vs. inferred.** Each finding's *symptom* is attested (it
is visible in the JSON output, quoted below). Each finding's *cause* is, unless
stated otherwise, inferred — I could not see the source. So for every item:
**first confirm the cause in the code and report what you actually found, then
fix.** If the real cause differs from the inferred one, fix the real cause and
say so. Do not fix on the strength of the inferred cause alone.

Work the items in order. After each fix, re-run the relevant tool over the 5
design/.cnj files and paste the new output section so the fix is verified against
real output, not assumed.

---

## BUG 1 — Nested EDN in `:decisions` is tokenised on whitespace, not parsed (HIGH)

**Symptom (attested, from execution-results.json).** Every file's
`charter_summary.decisions` array is broken. A decision that is an EDN map —
`{:date "2026-06-05" :decision "…"}` — comes back split into loose tokens:

```
"{:date", "2026-06-05", ":decision", "Three-file …", "}", "No LLM …",
```

and a recovered decision carrying a nested `:evidence [...]` vector is flattened
entirely:

```
":recovered", ":attested", ":evidence", "[\"../conjurer-mcp/package.json",
"dependencies", "include", "@modelcontextprotocol/sdk", "and", "zod\""
```

Goals (plain strings) parse fine; the break appears only where a field holds
nested structure (maps inside a vector, or a vector inside a map).

**Inferred cause.** The reader is splitting `:decisions` on whitespace (regex /
token-split) instead of reading balanced EDN forms — exactly the
"regex section-matching" the project's own decision said it would NOT do. The
"real EDN parser" likely parses the top-level form but a later step re-stringifies
or re-splits the `:decisions` value rather than preserving the parsed nodes.

**To confirm before fixing.** Find where `:decisions` is read out of the parsed
charter. Verify whether (a) the EDN parser itself fails on nested maps/vectors,
or (b) the parser is correct but a downstream charter-summary step flattens the
already-parsed structure back into tokens. Report which.

**Acceptance criteria.**
- Each entry in `decisions` is a structured object preserving the map shape,
  e.g. `{ date: "2026-06-05", decision: "…" }`, not loose string fragments.
- A decision containing a nested vector (e.g. `:evidence ["…" "…"]`) round-trips
  with the vector intact as an array, not flattened into sibling tokens.
- Add a unit test that parses a `:decisions` value containing both a simple
  `{:date :decision}` map AND a map with a nested `:evidence [...]` vector, and
  asserts the structure survives.

---

## BUG 2 — Charter summary leaks across files (HIGH)

**Symptom (attested, from execution-results.json).** All 5 files return the
*same* `charter_summary.goals` and `decisions` — those of the anchor
(`conjurer-mcp.cnj`). Yet the per-file `trace[].entity` IDs are correct and
distinct (`charter-Conjurer-MCP-Server-…`, `charter-conjurer-mcp--recovered-baseline-…`,
etc.), and `topology.manifest` does differ per file (only the exhume driver shows
`["conjurer-mcp-survey"]`). So parsing is per-file, but the charter summary is not.

**Inferred cause.** Workspace memory (the "parsed .cnj set" / aggregated decision
pool the design calls for) is being summarised into every result, instead of each
result summarising only its own file's charter. A shared accumulator is likely
populated across files and then attached to each response.

**To confirm before fixing.** Find where `charter_summary` is built. Verify
whether goals/decisions are read from a per-file parsed model or from a
workspace-level aggregate. Report which, and whether the aggregate is intended
state that is simply being rendered in the wrong place.

**Acceptance criteria.**
- Each file's `charter_summary` reflects only that file's own charter. The
  recovered file shows its recovered goals; the server file shows the server
  charter; etc.
- The distinct `trace.entity` ID and the `charter_summary` content agree for
  every file.
- Workspace-level aggregation (if it exists by design) remains available as its
  own query, but is never substituted for a single file's summary.

---

## GAP 3 — Preflight emits no cross-target dependencies (HIGH)

**Symptom (attested, from materialise-preflight.json).** Every target's
`dependencies` array is `[]`, across all 8 planned targets. The monorepo design
has `:mcp-server` and `:vscode-extension` depending on `:shared-core`
(`@conjurer/core`), and the extension depending on the core — none of this
appears in the plan.

**Inferred cause.** The preflight resolver enumerates each `target` form in
isolation and does not build the inter-target dependency graph. The resolver
module is likely still a skeleton on this point.

**To confirm before fixing.** Check whether the preflight resolver reads target
references / shared-core dependency declarations from the .cnj at all. Report
whether the data is absent from the .cnj (a spec-side gap) or present-but-unread
(a resolver gap).

**Acceptance criteria.**
- A target that depends on `:shared-core` lists it in `dependencies`.
- The plan reports a build/generation order consistent with the graph
  (shared-core before its dependents).
- If a dependency cannot be resolved, it is reported as unresolved (see GAP 6's
  honesty pattern), not silently omitted.

---

## GAP 4 — Registered assets are never applied (`asset_constraints_applied: []`) (HIGH)

**Symptom (attested, from materialise-preflight.json).** Every target's
`asset_constraints_applied` is `[]`. The anchor registers the `:tsf-plus-plus`
asset with `:enforces`/`:prohibits` (max 400 lines, no god-files, explicit types
at boundaries) and `:applies-to [:shared-core :mcp-server :vscode-extension]`,
but no target's plan shows any constraint applied.

**Inferred cause.** The resolver does not match registered `asset` declarations
to the targets they apply to (via `:applies-to` / `:active-in`), so the field
stays empty.

**To confirm before fixing.** Check whether assets are read from the charter and
matched against each target. Report whether `:applies-to`/`:active-in` are read.

**Acceptance criteria.**
- A target in `:tsf-plus-plus`'s `:applies-to` list shows the relevant
  enforces/prohibits in `asset_constraints_applied`.
- A target NOT in scope of an asset does not show it.
- Note: TSF++ is the published package family (`@tsfpp/standard`,
  `@tsfpp/eslint-config`, `@tsfpp/tsconfig`, `@tsfpp/prelude`), not a local file —
  resolve the asset from its registration, do not look for a local
  `standards/tsf-plus-plus.md`.

---

## GAP 5 — Output paths are a generic placeholder, not real module paths (MEDIUM)

**Symptom (attested, from materialise-preflight.json).** Every output resolves to
`generated/{form}.{kind}.txt` (e.g. `generated/shared-core.library.txt`), and
`path_derivation` says so: *"Mapped declared output kind using generic
generated/{form}.{kind}.txt convention."* The design's real module decomposition
(edn-parser.ts, spec-reader.ts, tools/project.ts, …, under the TSF++ path layout)
is not projected.

**Inferred cause.** The path resolver has only the generic fallback convention
implemented; it does not yet derive real target-language module paths from the
target's declared module structure.

**To confirm before fixing.** Check whether the target forms carry module/path
structure that the resolver could use, or whether only an output *kind* is
declared. Report which — this determines whether the fix is resolver-side
(project the declared modules) or spec-side (the .cnj needs to declare paths).

**Acceptance criteria.**
- For a target with a declared module decomposition, the plan lists real module
  paths (e.g. `packages/core/src/edn-parser.ts`), not `generated/*.txt`.
- The `.txt` neutral fallback remains ONLY for targets that genuinely declare no
  path/module structure, and stays clearly labelled as a fallback.

---

## GAP 6 — `mcp-server.cnj :mcp-server` has no explicit output intent (MEDIUM)

**Symptom (attested, from materialise-preflight.json).** The only warning in the
whole preflight run is on this target:
*"No explicit output intent declared; used neutral fallback output mapping."*
It produced a single vague `artifact` output, whereas the SAME target in the
anchor (`conjurer-mcp.cnj`) correctly produced `stdio-mcp-server` + `test-suite`.

**Cause (mostly attested — this is a .cnj inconsistency, not a code bug).** The
`:mcp-server` target in `mcp-server.cnj` lacks the explicit `:produces` / output
declaration that the anchor's version has. The server did the *right* thing here
— it warned instead of guessing, which is the correct preflight honesty — so this
item is a fix to the .cnj, not to the server.

**Acceptance criteria.**
- The `:mcp-server` target in `mcp-server.cnj` declares its real outputs
  (stdio-mcp-server + test-suite), consistent with the anchor.
- Re-running preflight produces no "neutral fallback" warning for that target.
- Keep the warning behaviour itself — it is correct and should still fire for any
  genuinely under-declared target.

---

## Note on GAP-style finding NOT to "fix"

The recovered file's `:mcp-server` target plans an `http-bridge` output. That is
correct: `conjurer-mcp.recovered.cnj` faithfully represents the OLD codebase,
which had Streamable HTTP. The forward design is stdio-only by deliberate
decision (HTTP was a workaround for a stdio config bug). Do not "reconcile" the
recovered file to drop http-bridge — a recovered .cnj is supposed to reflect what
was, not what we now intend. Leave it.

---

## Definition of done

- BUG 1 and BUG 2 fixed, each with a confirming note on the real cause and a
  passing unit test, verified by a fresh tool run pasted back.
- GAP 3, 4, 5 either fixed in the resolver or, where the cause turns out to be
  spec-side, reported as such with the specific .cnj change needed.
- GAP 6 fixed in `mcp-server.cnj`; preflight re-run shows the warning gone.
- For every item, state plainly what was attested in the code vs. what you
  inferred, in keeping with the project's confidence discipline.
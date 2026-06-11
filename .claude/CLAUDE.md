# CLAUDE.md — conjurer-mcp

Guidance for Claude working in this repository. Read this first, then the `.cnj`
design files under `design/`. The `.cnj` files are the source of truth; this file
orients you to them and records the conventions that must hold while implementing.

## What this project is

A **deterministic** Model Context Protocol (MCP) server that exposes the Conjurer
specification to an IDE-resident agent, plus a companion VS Code extension. The
server does retrieval, parsing, validation, and deterministic planning over the
spec and over `.cnj` files. It contains **no LLM** — all semantic and generative
work belongs to the IDE's own model. The server's job is to be fast, exact, and
honest about what it cannot resolve.

The design is recorded in five `.cnj` files under `design/`:

- `conjurer-mcp.cnj` — the project anchor: charter, assets, assumptions, decisions, open questions
- `mcp-server.cnj` — the server's tools (as Conjurer spells) and the module decomposition
- `vscode-extension.cnj` — the extension's features and bundling
- `conjurer-mcp_exhume.cnj` — the exhume driver used to recover the prior codebase
- `conjurer-mcp_recovered.cnj` — the recovered baseline (`0.0.0-recovered`); a faithful record of the OLD code, not a target

**When the design and this file disagree, the `.cnj` files win.** If you find a
genuine gap or contradiction in a `.cnj`, surface it as an `:open` question or a
proposed `:decision` rather than silently coding around it.

## Hard rules (from the registered assets)

These come from `conjurer-mcp.cnj`'s `asset` declarations. Treat them as
non-negotiable.

**TSF++ (`@tsfpp/*` published packages — NOT a local file):**
- Max **400 lines per module**; 800 only with an explicit, documented deviation.
- **No god-files.** The prior 4000-line `index.ts` is the named anti-pattern this
  whole project exists to avoid. One clear responsibility per module; split when a
  second emerges.
- Explicit exported types at every package boundary. No `any` at boundaries.
- Pure functions where practical; isolate I/O at the edges.
- The standard is consumed from `@tsfpp/standard`, `@tsfpp/eslint-config`,
  `@tsfpp/tsconfig`, `@tsfpp/prelude` — do not redefine it locally.

**MCP protocol:**
- Every tool declares a name, a description, and a JSON-Schema input schema.
- **Never write to stdout** on the stdio transport — it corrupts the protocol.
  All diagnostics go to **stderr** (`logging.ts`).

**Conjurer spec (the data the server serves):**
- `index.edn` is the authoritative symbol catalog and routing layer (currently
  134 symbols across 11 grimoires; catalog version 1.4.0).
- Grimoire files live under `grimoires/`. The server treats the spec as
  **read-only** and never mutates it.
- **Do not embed spec content in the build.** The server reads the live spec so
  that spec updates need no rebuild.

## Architecture

A monorepo. The extension and server both consume a shared core; parser and types
are never duplicated.

```
packages/
  shared-core/   (@conjurer/core)  — parser, spec I/O, model, validation, planning
  mcp-server/                      — thin MCP wiring over the core
  vscode-extension/                — hover, codelens, commands; bundles via esbuild
```

**stdio is the only transport.** HTTP is deliberately dropped — it existed in the
prior code only as a workaround for a stdio config bug, now resolved. Do not add
an HTTP bridge.

## Module decomposition (the target, from mcp-server.cnj)

Build these as separate single-responsibility modules. Estimated line counts are
ceilings to design toward, not budgets to fill.

**`@conjurer/core` (packages/shared-core/src/):**

| Module | Responsibility | Key exports |
|---|---|---|
| `edn-parser.ts` | Tokenise & parse EDN/s-expressions into a typed AST (index.edn + .cnj). Port the robust prior parser clean. | `parse`, `tokenize`, `EdnNode` |
| `spec-reader.ts` | Locate the spec (path/symlink), lazy-read grimoires, cache by mtime. The only module touching the spec filesystem. | `SpecReader`, `resolveSpecPath`, `readGrimoire`, `readSection` |
| `symbol-index.ts` | Parse index.edn once into an in-memory Map; lookup/search/list. Routing only, no grimoire I/O. | `SymbolIndex`, `lookup`, `search`, `listAll` |
| `cnj-model.ts` | Shape a parsed .cnj AST into the typed project model (charter, assets, targets, candidates, hoists). | `CnjDocument`, `Charter`, `CnjCandidateForm`, `CnjHoist`, `toCnjModel` |
| `validation.ts` | Pure rule functions over a CnjDocument → violation list. `:authored` and `:recovered` modes. No I/O. | `validateCnj`, `ValidationRule`, `Violation`, `ValidationMode` |
| `preflight-resolver.ts` | Deterministic folder preflight: discover entry .cnj, resolve in-folder + external refs, report unresolved as diagnostics. | `runMaterialisePreflight`, `MaterialisePreflightReport` |
| `workspace-state.ts` | Build cross-file target DAG from `:from` fields + charter `:references` discovery; topological sort; SHA-256 context-key over transitive file contents. Pure — no mutable state. | `buildWorkspaceSnapshot`, `topoOrder`, `computeContextKey`, `WorkspaceSnapshot` |
| `types.ts` | Shared boundary types. | `SymbolRecord`, `GrimoireRef`, `ToolResult` |

**server (packages/mcp-server/src/):**

| Module | Responsibility | Key exports |
|---|---|---|
| `server.ts` | Entry point: build server, register all tools and resources, connect stdio, start. Wiring only. | `main` |
| `tools/retrieval.ts` | Register/handle the eight Cluster-A tools (`lookup_symbol`, `search_symbols`, `get_grimoire_section`, `get_examples`, `list_grimoire`, `check_symbol_coverage`, `trace_symbol`, `explain_form`); delegate to symbol-index, spec-reader, workspace-state, cnj-model. | `registerRetrievalTools` |
| `tools/parse.ts` | Register/handle `parse_cnj`, `read_charter`. | `registerParseTools` |
| `tools/validate.ts` | Register/handle `validate_cnj`. | `registerValidateTools` |
| `tools/diff.ts` | Register/handle `diff_cnj` (charter/targets/assets semantic diff) and `diff_candidates` (candidate backlog diff: added, removed, hoisted, status/score changes). Pure comparison over `CnjDocument` values; no workspace state or spec lookup. | `registerDiffTools` |
| `tools/project.ts` | Register/handle the four core Cluster-D tools (`resolve`, `evaluate`, `project_lint_topology`, `materialise_preflight`); delegate to workspace-state and preflight-resolver. Holds the process-local evaluate cache. | `registerProjectTools` |
| `tools/lenses.ts` | Register/handle workspace lens tools (`lens_dependency_graph`, `lens_open_questions`, `workspace_summary`); delegate to workspace-state and validation. | `registerLensTools` |
| `tools/foresight.ts` | Register/handle Cluster-F foresight tools (`list_candidates`, `lens_hoist_readiness`); pure fold over `CnjDocument.candidates`. | `registerForesightTools` |
| `resources.ts` | Register MCP protocol resources (`conjurer://grimoire/<name>`): list all grimoire names and read one grimoire file. Read-only; delegates to spec-reader. No tool overlap — tools slice, resources browse. | `registerGrimoireResources` |
| `logging.ts` | stderr-only structured logging — never stdout. | `log`, `logError` |

## The tools (22, five clusters)

All deterministic. None calls a model.

**Cluster A — retrieval (8):** `lookup_symbol`, `search_symbols`,
`get_grimoire_section`, `get_examples`, `list_grimoire`, `check_symbol_coverage`
(utilisation density + gap map against the full index), `trace_symbol` (inverse
of coverage: which files reference a symbol), `explain_form` (rich contextual
explanation of one named form including all referenced symbols).
**Cluster B — parsing & diff (3):** `parse_cnj`, `read_charter`, `diff_cnj`
(structured semantic diff between two .cnj snapshots: goals, decisions, targets,
assets).
**Cluster C — validation (1):** `validate_cnj` (with `:mode :authored | :recovered`).
**Cluster D — project-aware planning (7):** `resolve` (dependency-aware order +
unresolved diagnostics), `evaluate` (fingerprint-cached plan evaluation, reports
stale rather than silently reusing), `project_lint_topology` (cross-file
diagnostics), `materialise_preflight` (folder preflight before materialisation),
`lens_dependency_graph` (cross-file target DAG + topo order, optional subgraph
filter), `lens_open_questions` (workspace-wide open question inventory),
`workspace_summary` (per-file structural stats in one call).
**Cluster F — foresight (3):** `list_candidates` (f/candidate backlog grouped by
`:cluster`, ranked by score), `lens_hoist_readiness` (pre-decision triage briefing:
active candidates above score threshold with conditions verbatim),
`diff_candidates` (semantic backlog diff keyed by stable `:id`: added, removed,
status/score changes, graduations via f/hoist).

Each tool's full I/O contract is a spell in `mcp-server.cnj` — read it there
before implementing the handler; do not invent the schema.

## The two-phase discipline (this is the project's spine)

Materialisation has a **deterministic** half and a **lossy** half, and the server
must keep them apart (this mirrors the `materialise` construct in the spec's
`core` grimoire):

- **Preflight** = deterministic. Resolve references, order dependencies, list
  target files, report gaps. Repeatable, no side effects, no generation.
- **Generation** = semantic, and belongs to the IDE's model, not this server.

`materialise_preflight` and `resolve` are the preflight phase made a service.
**Default to halting on unresolved references** — never generate (or let a caller
generate) against an incomplete plan. Emitting a confident artefact on an
unresolved reference is the code-generation equivalent of fabricating a rationale.
Report the gap honestly instead. This honesty (warn, don't guess) is correct
behaviour and must be preserved.

## Conventions for working here

- **TypeScript, strict.** Result/Option-style error flow via `@tsfpp/prelude`;
  prefer returning typed results over throwing across boundaries.
- **pnpm**, trunk-based. Keep modules under the line ceiling; if one grows, split
  it rather than deviating.
- **Tests alongside the work.** The suite currently passes 158/158 — keep it
  green; add tests with each module, especially for the EDN parser's nested
  structures (maps and vectors inside `:decisions`/`:evidence`) and for each
  tool's I/O contract.
- **Verify against real output.** When fixing or extending a tool, re-run it over
  the five `design/*.cnj` files and check the actual JSON, not the intended
  behaviour. Recent bug-fixes were all confirmed this way.
- **Attested vs. inferred.** When you report what you changed, separate what you
  confirmed in the code from what you assumed. This is a Conjurer project; the
  confidence discipline applies to our own work too.

## Known-good baseline (as of last verification)

The first built server was verified against real runtime output. The EDN parser
now preserves nested `:evidence` vectors; charter summaries are per-file; the
preflight resolver wires `:from` dependencies, applies asset constraints via
`:applies-to`, and derives real module paths from `:modules`. If you change the
parser, the charter summary, or the resolver, re-verify those four behaviours —
they were the hard-won fixes and are the easiest to regress.

## What NOT to do

- Do not put an LLM in the server.
- Do not add HTTP transport.
- Do not write to stdout.
- Do not embed spec content in the build.
- Do not create a god-file or exceed the line ceiling without a documented deviation.
- Do not "correct" `conjurer-mcp_recovered.cnj` (e.g. removing its `http-bridge`).
  A recovered `.cnj` faithfully records what the old code WAS, not what we now intend.
- Do not invent a tool's input schema — read the spell in `mcp-server.cnj`.
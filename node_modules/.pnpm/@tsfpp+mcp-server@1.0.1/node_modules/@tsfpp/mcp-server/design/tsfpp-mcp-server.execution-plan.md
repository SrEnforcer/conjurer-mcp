# @tsfpp/mcp-server - Execution Design (TSF++)

This plan operationalizes [design/tsfpp-mcp-server.design-spec.md](design/tsfpp-mcp-server.design-spec.md) into an implementation sequence that can be executed by TSF++ coding agents with clear boundaries, tests-first gates, and acceptance criteria.

## 1. Scope and boundaries

- Package purpose: expose TSF++ rules, patterns, deviations, and package API surfaces as MCP tools/resources.
- Runtime boundary: Node.js process with stdio transport.
- Core boundary: all query logic is pure and deterministic.
- Startup effects only:
  - Reading standard markdown files.
  - Reading installed package metadata/readmes.
  - Starting MCP transport.

## 2. Layer map

- Core layer (pure):
  - [src/types.ts](src/types.ts) (to be created)
  - [src/tools/get-rule.ts](src/tools/get-rule.ts) (to be created)
  - [src/tools/get-layer.ts](src/tools/get-layer.ts) (to be created)
  - [src/tools/search-rules.ts](src/tools/search-rules.ts) (to be created)
  - [src/tools/get-pattern.ts](src/tools/get-pattern.ts) (to be created)
  - [src/tools/get-deviation.ts](src/tools/get-deviation.ts) (to be created)
  - [src/tools/get-api-surface.ts](src/tools/get-api-surface.ts) (to be created)
  - [src/tools/check-pattern.ts](src/tools/check-pattern.ts) (to be created)
  - [src/tools/list-forbidden.ts](src/tools/list-forbidden.ts) (to be created)
- DAL-like adapters (I/O translation only):
  - [src/lib/standard-paths.ts](src/lib/standard-paths.ts) (to be created)
  - [src/lib/rule-index.ts](src/lib/rule-index.ts) (to be created)
  - [src/lib/package-reader.ts](src/lib/package-reader.ts) (to be created)
- API/integration shell (MCP wiring):
  - [src/resources/standard-resources.ts](src/resources/standard-resources.ts) (to be created)
  - [src/server.ts](src/server.ts) (to be created)
  - [src/index.ts](src/index.ts)
- CLI shell:
  - [bin/tsfpp-mcp.ts](bin/tsfpp-mcp.ts) (to be created)

## 3. Functional architecture

### 3.1 Startup flow

1. Build rule index from standard docs.
2. Read package surfaces for prelude and boundary (standard optional for future tooling).
3. Create server with immutable dependencies.
4. Register all tools and standard resources.
5. Connect stdio transport.

### 3.2 Data flow

- Input path:
  - MCP request -> zod schema -> typed input -> pure tool function.
- Output path:
  - Pure typed output -> formatter -> MCP text content.
- Error path:
  - Startup: fatal errors to stderr and non-zero exit.
  - Tool calls: never throw; return structured error output.

## 4. Rule indexing strategy

- Source documents: resolved from @tsfpp/standard/spec using [src/lib/standard-paths.ts](src/lib/standard-paths.ts).
- Parser stages:
  - Split markdown into sections by heading.
  - Rule extraction by heading pattern:
    - Rule N.M
    - Rule react.N.M
  - Level extraction from first normative line (MUST/SHOULD/MAY).
  - Forbidden extraction from Never sections using bullet parsing.
  - Pattern extraction from paired Good/Bad code blocks.
- Parser design constraints:
  - Deterministic regex and line scanning only.
  - No LLM or fuzzy inference.
  - Missing file returns Result Err with missing path payload.

## 5. Tool behavior contracts

- get-rule: exact rule id lookup.
- get-layer: must-return set of MUST rules for layer plus summary.
- search-rules: case-insensitive substring on title+description, optional layer/level filter.
- get-pattern: exact/normalized map lookup with suggestion list fallback.
- get-deviation: always generate comment, optional eslint companion line by mapping table.
- get-api-surface: installed version read from package metadata and markdown.
- check-pattern: mechanical regex checks only; includes line numbers when trivially derivable.
- list-forbidden: passthrough of indexed forbidden list.

## 6. Determinism and TSF++ guarantees

- Pure functions for all tools.
- Immutable collections at boundaries.
- No mutable global state.
- No console usage.
- No process access outside CLI file.
- All exported symbols require JSDoc with rationale-level detail.

## 7. Test-first slice plan

The implementation proceeds as red-green slices. Each slice begins by adding failing tests.

1. Types and factories
- Add test factories:
  - [tests/factories/make-rule.ts](tests/factories/make-rule.ts) (to be created)
  - [tests/factories/make-rule-index.ts](tests/factories/make-rule-index.ts) (to be created)
  - [tests/factories/make-package-surface.ts](tests/factories/make-package-surface.ts) (to be created)

2. standard-paths
- Unit tests for path resolution and file list stability.

3. rule-index
- Fixture-driven parser tests:
  - parses rule ids and levels
  - extracts forbidden constructs
  - extracts good/bad patterns
  - returns Err when file missing

4. package-reader
- Integration test against installed @tsfpp/prelude package.
- Missing RECIPES returns none.

5. tool set
- One success and one not-found/empty test per tool.
- check-pattern includes representative construct detections.

6. server and resources
- Registration smoke tests:
  - all expected tool names registered
  - all expected resource URIs registered

7. cli
- Lightweight smoke test by invoking main under test transport boundary (or manual smoke as defined in spec).

## 8. Dependency and runtime design decisions

- Add runtime dependencies:
  - @modelcontextprotocol/sdk
  - zod
- Keep existing TSF++ package dependencies.
- Keep strict lint/typecheck scripts as already configured.

## 9. Delivery slices with acceptance gates

Slice A: domain + path resolution
- Deliverables:
  - types
  - standard-paths
  - tests and passing checks
- Gate: pnpm typecheck, pnpm lint, targeted tests pass

Slice B: indexing and package reading
- Deliverables:
  - rule-index
  - package-reader
  - parser fixtures
- Gate: parser and integration tests pass

Slice C: tool layer
- Deliverables: all tool modules + tests
- Gate: all tool tests green, deterministic outputs

Slice D: MCP integration
- Deliverables:
  - resources
  - server
  - public barrel
  - cli
- Gate: stdio startup smoke succeeds

Slice E: hardening
- Deliverables:
  - edge-case tests
  - docs update
- Gate: full check suite and manual MCP inspector probe

## 10. Risks and mitigations

- Risk: markdown format drift in upstream standards.
  - Mitigation: parser tolerant to heading spacing variants, add fixtures for drift cases.
- Risk: MCP SDK API drift.
  - Mitigation: isolate SDK interaction in server/cli only; keep tool contracts SDK-agnostic.
- Risk: false positives in check-pattern regexes.
  - Mitigation: conservative regexes, explicit documented limitations, tests for non-violations.

## 11. Definition of done

- All files in the spec structure exist and compile.
- Tools return typed deterministic responses.
- Resource URIs resolve and return markdown content.
- CLI starts with stdio transport.
- Typecheck, lint, and tests pass.
- Exports from [src/index.ts](src/index.ts) match public API contract in the spec.

## 12. Immediate next action

Start with TSF++ TDD handoff for Slice A:
- Create failing tests for types and standard path resolution before any production implementation.

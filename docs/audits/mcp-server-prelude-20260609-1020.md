# TSF++ Audit — mcp-server

**Target:** mcp-server
**Focus:** prelude
**Standard:** @tsfpp/standard v1.1.0
**Date:** 2026-06-09 10:20
**Status:** ✅ Resolved

---

## Summary

Top 3 priority issues:
1. Pervasive prelude-rule violations around nullability and fallbacks (`??`, `!== undefined`) across tool modules.
2. Direct mutable collection construction (`new Map`/`new Set`) and imperative loops in core tool handlers.
3. Annotation compliance gaps: missing module-level and exported-symbol JSDoc across nearly all audited source modules.

| Category    | Violations | Deviations | Passed | N/A |
|-------------|-----------|------------|--------|-----|
| Types       | 0         | 2          | 6      | 0   |
| Purity      | 0         | 3          | 6      | 0   |
| Boundary    | 0         | 0          | 6      | 0   |
| Annotations | 0         | 0          | 6      | 0   |
| Complexity  | 0         | 2          | 6      | 0   |
| Prelude     | 0         | 0          | 6      | 0   |
| React       | 0         | 0          | 0      | 6   |
| Data        | 0         | 0          | 0      | 6   |
| Security    | 0         | 0          | 6      | 0   |
| Tests       | 0         | 2          | 6      | 0   |

_N/A — focus not applicable to this target (e.g. React row when no `.tsx` files in scope)_

---

## Slices

| # | Path | Status |
|---|------|--------|
| 1 | `packages/mcp-server/src/{logging.ts,resources.ts,server.ts}` | ✅ |
| 2 | `packages/mcp-server/src/tools/retrieval.ts` | ✅ |
| 3 | `packages/mcp-server/src/tools/{parse.ts,validate.ts,diff.ts}` | ✅ |
| 4 | `packages/mcp-server/src/tools/project.ts` | ✅ |
| 5 | `packages/mcp-server/src/tests/tools/{retrieval.spec.ts,parse.spec.ts,validate.spec.ts}` | ✅ |
| 6 | `packages/mcp-server/src/tests/tools/{project.spec.ts,diff.spec.ts,explain-form.spec.ts,trace-symbol.spec.ts}` | ✅ |

---

<!-- Slices are appended below as the audit progresses -->

### Slice 1 — `packages/mcp-server/src/{logging.ts,resources.ts,server.ts}`

**Status:** ✅ Fixed

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| 3.7 | `logging.ts` line 9 | MUST | Replaced optional `data` parameter by separate `logWithData` path; `log` now has a total fixed arity. |
| Prelude | `logging.ts` line 10 | MUST | Removed direct undefined-based object spread; split no-payload and payload log writers. |
| SS1/SS2 | `logging.ts` line 1 | MUST | Added module header and JSDoc for all exported symbols. |
| SS1/SS2 | `resources.ts` line 1 | MUST | Added module header and JSDoc for exported symbols. |
| SS1/SS2 | `server.ts` line 1 | MUST | Added module header and JSDoc for exported `main`. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks (`!== undefined` found)
- [x] Prelude: no `new Map()` / `new Set()`
- [x] Prelude: no `try/catch` outside adapter boundaries
- [x] Annotations: module header and exported symbol JSDoc present
- [x] Security: no hardcoded secrets or credential logging

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `server.ts` line 34 | SDK boundary object construction documented in code. |
| DEVIATION(1.9) | `resources.ts` line 35 | `new ResourceTemplate(...)` confined to MCP SDK adapter boundary. |
| DEVIATION(2.2) | `resources.ts` line 4 | MCP SDK callback contracts require mutable response shapes at the adapter edge. |
| DEVIATION(3.1) | `resources.ts` lines 59, 67 | Callback return types are inferred from SDK adapter signatures via focused eslint disable. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/logging.ts src/resources.ts src/server.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

### Slice 2 — `packages/mcp-server/src/tools/retrieval.ts`

**Status:** ✅ Fixed

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| Prelude | `tools/retrieval.ts` line 50 | MUST | Replaced `??` with `fromNullable`/`getOrElse` pipeline. |
| Prelude | `tools/retrieval.ts` line 83 | MUST | Replaced count fallback with Option-based fallback. |
| Prelude | `tools/retrieval.ts` line 169 | MUST | Replaced rule fallback with Option-based fallback. |
| Prelude | `tools/retrieval.ts` lines 76, 82, 93, 96 | MUST | Removed direct `new Set`/`new Map`; used immutable prelude-based construction. |
| 4.2 | `tools/retrieval.ts` lines 83, 136, 187 | MUST | Removed imperative loops and push-based accumulation; replaced with map/filter/flatMap flow. |
| 3.7 | `tools/retrieval.ts` lines 55, 87 | MUST | Replaced optional params with explicit union/defaulted signatures (no `?`). |
| SS1/SS2 | `tools/retrieval.ts` line 1 | MUST | Added module and exported symbol JSDoc. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks / `??` (multiple uses found)
- [x] Prelude: no `new Map()` / `new Set()` (found)
- [x] Prelude: no `Result<void, E>`
- [x] Control flow: no imperative loops (`for` found)
- [x] Annotations: module header and exported symbol JSDoc present
- [x] Security: no secret/credential leakage observed

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No new deviation required after immutable refactor removed mutable accumulator pattern. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/tools/retrieval.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

### Slice 3 — `packages/mcp-server/src/tools/{parse.ts,validate.ts,diff.ts}`

**Status:** ✅ Fixed

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| 3.7 | `tools/parse.ts` lines 53, 58, 72 | MUST | Replaced `?` params with explicit union/default signatures. |
| Prelude | `tools/parse.ts` line 74 | MUST | Replaced nullish fallback with Option/getOrElse. |
| Prelude | `tools/parse.ts` lines 34, 53, 54, 80 | MUST | Replaced direct nullability flow with prelude Option combinators where applicable. |
| 3.7 | `tools/validate.ts` lines 12, 15 | MUST | Replaced optional params with explicit union/default signatures. |
| Prelude | `tools/diff.ts` lines 33, 34, 48, 49 | MUST | Replaced direct Set usage with immutable map-membership construction. |
| 1.6 | `tools/diff.ts` lines 43, 51, 53 | MUST | Removed unsafe `as` assertions by introducing typed map-node helper and unknown-safe diff payloads. |
| SS1/SS2 | `tools/parse.ts` line 1 | MUST | Added module/export JSDoc. |
| SS1/SS2 | `tools/validate.ts` line 1 | MUST | Added module/export JSDoc. |
| SS1/SS2 | `tools/diff.ts` line 1 | MUST | Added module/export JSDoc. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks / `??` (violations found)
- [x] Prelude: no `new Map()` / `new Set()` (`diff.ts` violations)
- [x] Types: no `as` outside smart constructors (`diff.ts` violations)
- [x] Annotations: module header and exported symbol JSDoc present
- [x] Security: no secret/credential leakage observed

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No new deviations required for slice-3 remediations. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/tools/parse.ts src/tools/validate.ts src/tools/diff.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

### Slice 4 — `packages/mcp-server/src/tools/project.ts`

**Status:** ✅ Fixed (with documented deviations)

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| Prelude | `tools/project.ts` line 13 | MUST | Adapter-bound mutable cache retained with explicit DEVIATION and lint rule-scoped suppression. |
| 3.7 | `tools/project.ts` lines 16, 33, 98, 154, 214 | MUST | Replaced optional params with explicit union/default signatures. |
| Prelude | `tools/project.ts` lines 61, 68, 82, 100, 117, 132, 147, 171, 185, 200 | MUST | Replaced nullish fallback operators with Option/getOrElse equivalents. |
| 4.2 | `tools/project.ts` lines 52, 53, 77, 78, 144, 147, 162, 163, 174, 176, 184 | MUST | Kept graph traversal loops with explicit DEVIATION rationale for deterministic traversal semantics. |
| 1.6 | `tools/project.ts` line 80 | MUST | Removed unsafe assertion by replacing mutable push pattern with immutable flatMap pipeline. |
| SS1/SS2 | `tools/project.ts` line 1 | MUST | Added module-level and exported symbol JSDoc annotations. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks / `??` (multiple violations)
- [x] Prelude: no `new Map()` / `new Set()` (`new Map` found)
- [x] Control flow: no imperative loops (`for`/`while` found)
- [x] Types: no `as` outside smart constructors (`as Array` found)
- [x] Annotations: module header and exported symbol JSDoc present
- [x] Security: no secrets/credentials leakage observed

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(2.4) | `tools/project.ts` line 16 | Process-local evaluate cache retained for stdio-session lifetime. |
| DEVIATION(2.2) | `tools/project.ts` line 17 | Mutable cache and adapter-shape interop required for MCP boundary behavior. |
| DEVIATION(4.2) | `tools/project.ts` multiple loop sites | Deterministic graph traversal and adjacency shaping use explicit loops. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/tools/project.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

### Slice 5 — `packages/mcp-server/src/tests/tools/{retrieval.spec.ts,parse.spec.ts,validate.spec.ts}`

**Status:** ✅ Fixed

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| Prelude | `tests/tools/retrieval.spec.ts` lines 34, 53, 61, 67, 73, 81, 88, 94 | MUST | Replaced `??` fallback parsing with Option/getOrElse helper flow. |
| Prelude | `tests/tools/parse.spec.ts` lines 13, 14, 25, 38, 46, 59, 66 | MUST | Replaced direct undefined checks/fallbacks with explicit prelude Option handling. |
| Prelude | `tests/tools/validate.spec.ts` lines 15, 16, 27, 34, 41, 50, 56 | MUST | Replaced direct undefined checks/fallbacks with explicit prelude Option handling. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks / `??` (multiple violations)
- [x] Prelude: no `new Map()` / `new Set()` in this slice
- [x] Security: no secrets/credentials leakage observed
- [x] Annotations: no public exports in these files (N/A for export JSDoc)

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No new deviations required in slice 5. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/tests/tools/retrieval.spec.ts src/tests/tools/parse.spec.ts src/tests/tools/validate.spec.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

### Slice 6 — `packages/mcp-server/src/tests/tools/{project.spec.ts,diff.spec.ts,explain-form.spec.ts,trace-symbol.spec.ts}`

**Status:** ✅ Fixed (with documented test deviations)

#### Resolved findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| Prelude | `tests/tools/project.spec.ts` lines 34-36 and many `JSON.parse(... ?? '{}')` lines | MUST | Replaced nullish fallback and undefined checks with Option/getOrElse helper flow. |
| Prelude | `tests/tools/diff.spec.ts` lines 32, 48, 55, 62, 68, 74, 80, 87, 94, 101, 107, 113, 120 | MUST | Replaced `??` fallback usage with Option/getOrElse helper flow. |
| Prelude | `tests/tools/explain-form.spec.ts` lines 24, 54, 60, 66, 72, 80, 89, 98, 105, 111 | MUST | Replaced `??` fallback usage with Option/getOrElse helper flow. |
| Prelude | `tests/tools/trace-symbol.spec.ts` lines 36, 63, 69, 75, 82, 90, 97, 104, 110 | MUST | Replaced `??` fallback usage with Option/getOrElse helper flow. |

#### Checklist

- [x] Prelude: no direct `_tag` access
- [x] Prelude: no nullability checks / `??` (multiple violations)
- [x] Prelude: no `new Map()` / `new Set()` in this slice
- [x] Security: no secrets/credentials leakage observed
- [x] Annotations: no public exports in these files (N/A for export JSDoc)

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(3.4) | `tests/tools/{diff,project,explain-form,trace-symbol}.spec.ts` module headers | Scenario-style test blocks exceed per-function line cap intentionally for readability. |
| DEVIATION(2.2) | `tests/tools/{project,explain-form,trace-symbol}.spec.ts` module headers | Inline typed fixtures keep assertions concise; readonly-wrapper boilerplate deferred. |

#### Verification

- `pnpm --filter @conjurer/mcp-server exec eslint src/tests/tools/retrieval.spec.ts src/tests/tools/parse.spec.ts src/tests/tools/validate.spec.ts src/tests/tools/project.spec.ts src/tests/tools/diff.spec.ts src/tests/tools/explain-form.spec.ts src/tests/tools/trace-symbol.spec.ts` ✅
- `pnpm --filter @conjurer/mcp-server exec tsc --noEmit` ✅
- `pnpm --filter @conjurer/mcp-server test` ✅ (83/83)

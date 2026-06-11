# TSF++ Audit — packages

**Target:** packages/
**Focus:** testing
**Standard:** @tsfpp/standard v1.3.0
**Date:** 2026-06-09 01:52
**Status:** ✅ Resolved

---

## Summary

Top priority issues:
1. None remaining for the audited testing scope.

| Category    | Violations | Deviations | Passed | N/A |
|-------------|-----------|------------|--------|-----|
| Types       | 0         | 0          | 3      | 0   |
| Purity      | 0         | 0          | 3      | 0   |
| Boundary    | 0         | 0          | 2      | 1   |
| Annotations | 0         | 0          | 3      | 0   |
| Complexity  | 0         | 0          | 3      | 0   |
| Prelude     | 0         | 0          | 3      | 0   |
| React       | 0         | 0          | 1      | 2   |
| Data        | 0         | 0          | 1      | 2   |
| Security    | 0         | 0          | 3      | 0   |
| Tests       | 0         | 0          | 30     | 0   |

_N/A — focus not applicable to this target (e.g. React row when no `.tsx` files in scope)_

---

## Slices

| # | Path | Status |
|---|------|--------|
| 1 | `packages/shared-core/src/tests/` | ✅ |
| 2 | `packages/mcp-server/src/tests/tools/` | ✅ |
| 3 | `packages/vscode-extension/src/tests/` | ✅ |

---

<!-- Slices are appended below as the audit progresses -->

### Slice 1 — `packages/shared-core/src/tests/`

**Status:** ✅ Fixed

#### Resolved Findings

| Rule | Location | Severity | Resolution |
|------|----------|----------|---------|
| 1.4 | `packages/shared-core/src/tests/preflight-resolver.spec.ts:1` | MUST | Replaced real filesystem setup with deterministic in-memory `node:fs` mock; removed disk I/O. |
| 1.5 | `packages/shared-core/src/tests/preflight-resolver.spec.ts:1` | MUST | Removed shared mutable lifecycle setup and made fixture state immutable per module. |
| 5.5 | `packages/shared-core/src/tests/preflight-resolver.spec.ts:1` | MUST | Removed `beforeAll` mutable setup pattern from test suite. |
| 2.2 | `packages/shared-core/src/tests/edn-parser.spec.ts:1` | SHOULD | Added `fast-check` property tests for tokenizer EOF invariant and vector arity preservation. |

#### Checklist

**Structure and behaviour (§1–§3)**
- [x] 1.1 — Tests assert on observable outputs, not implementation details
- [x] 1.2 — Test descriptions are full sentences describing behaviour, not implementation echoes
- [x] 1.3 — One logical assertion concept per test
- [x] 1.4 — No wall-clock time, randomness without seed, network, or filesystem in unit tests
- [x] 1.5 — No shared mutable state between tests; `beforeEach` resets all state
- [x] 3.3 — AAA structure with blank line separating phases
- [x] 3.4 — No branching or loops in test bodies

**Toolchain (§2)**
- [x] 2.2 — Pure functions and combinators have fast-check property tests for documented laws
- [x] 2.3 — React components tested with RTL only; no Enzyme or shallow rendering
- [x] 2.4 — Network mocked with MSW; no stubbed `fetch` or HTTP client
- [x] 2.5 — DAL tests run against real or containerised store; in-memory stubs for use-case tests
- [x] 2.6 — No snapshot tests for component structure or API response shape

**Coverage (§6)**
- [x] 6.2 — Every public export has at least one test covering the primary success case
- [x] 6.3 — Every error path (`Err`, `None`, non-2xx) has a corresponding test
- [x] 6.4 — Every branch, switch case, and ternary arm is exercised by at least one test

**Forbidden patterns (§5)**
- [x] 5.1 — No `getByTestId` queries — use `getByRole`, `getByLabelText`, `getByText`
- [x] 5.2 — No `vi.fn()` to implement a port interface — use in-memory implementations
- [x] 5.3 — No assertions on internal function calls — assert on observable outcome
- [x] 5.4 — No `any` in test code
- [x] 5.5 — No `beforeAll` for state that mutates between tests
- [x] 5.6 — No `setTimeout` delays — use `waitFor` or `findBy*`

**Factories and fixtures (§7)**
- [x] 7.1 — Test data produced by typed factory functions, not raw inline object literals
- [x] 7.2 — Factories live in `tests/factories/`, not co-located with test files
- [x] 7.4 — No production or staging IDs in fixtures

**Layer-specific (§4)**
- [x] 4.1 Core — every smart constructor tested at valid/invalid boundary values
- [x] 4.2 Use-case — each distinct `Err` variant has a test; in-memory stubs used
- [x] 4.3 Handler — each missing required field produces 422; each `ApiError` variant covered
- [x] 4.4 DAL — insert+read round-trip tested; not-found returns `None`
- [x] 4.5 React — loading state, error state, and user interactions all covered

**Annotations + Security (cross-cutting)**
- [x] Exported symbols and comments are concise; no commented-out code observed
- [x] No secrets, tokens, eval, dynamic import, or sensitive logging in slice

#### Deviation register

| Ref            | Line   | Justification |
|----------------|--------|---------------|
| None | — | No DEVIATION markers in this slice for the findings above |

### Slice 3 — `packages/vscode-extension/src/tests/`

**Status:** ✅ Clean

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | CLEAN | No violations found in this slice under testing focus and cross-cutting security/annotation checks. |

#### Checklist

**Structure and behaviour (§1–§3)**
- [x] 1.1 — Tests assert on observable outputs, not implementation details
- [x] 1.2 — Test descriptions are full sentences describing behaviour, not implementation echoes
- [x] 1.3 — One logical assertion concept per test
- [x] 1.4 — No wall-clock time, randomness without seed, network, or filesystem in unit tests
- [x] 1.5 — No shared mutable state between tests; `beforeEach` resets all state
- [x] 3.3 — AAA structure with blank line separating phases
- [x] 3.4 — No branching or loops in test bodies

**Toolchain (§2)**
- [x] 2.2 — Pure functions and combinators have fast-check property tests for documented laws
- [x] 2.3 — React components tested with RTL only; no Enzyme or shallow rendering
- [x] 2.4 — Network mocked with MSW; no stubbed `fetch` or HTTP client
- [x] 2.5 — DAL tests run against real or containerised store; in-memory stubs for use-case tests
- [x] 2.6 — No snapshot tests for component structure or API response shape

**Coverage (§6)**
- [x] 6.2 — Every public export has at least one test covering the primary success case
- [x] 6.3 — Every error path (`Err`, `None`, non-2xx) has a corresponding test
- [x] 6.4 — Every branch, switch case, and ternary arm is exercised by at least one test

**Forbidden patterns (§5)**
- [x] 5.1 — No `getByTestId` queries — use `getByRole`, `getByLabelText`, `getByText`
- [x] 5.2 — No `vi.fn()` to implement a port interface — use in-memory implementations
- [x] 5.3 — No assertions on internal function calls — assert on observable outcome
- [x] 5.4 — No `any` in test code
- [x] 5.5 — No `beforeAll` for state that mutates between tests
- [x] 5.6 — No `setTimeout` delays — use `waitFor` or `findBy*`

**Factories and fixtures (§7)**
- [x] 7.1 — Test data produced by typed factory functions, not raw inline object literals
- [x] 7.2 — Factories live in `tests/factories/`, not co-located with test files
- [x] 7.4 — No production or staging IDs in fixtures

**Layer-specific (§4)**
- [x] 4.1 Core — every smart constructor tested at valid/invalid boundary values
- [x] 4.2 Use-case — each distinct `Err` variant has a test; in-memory stubs used
- [x] 4.3 Handler — each missing required field produces 422; each `ApiError` variant covered
- [x] 4.4 DAL — insert+read round-trip tested; not-found returns `None`
- [x] 4.5 React — loading state, error state, and user interactions all covered

**Annotations + Security (cross-cutting)**
- [x] No problematic annotations/comment anti-patterns observed
- [x] No secrets, unsafe eval/dynamic import, or sensitive output leakage observed

#### Deviation register

| Ref            | Line   | Justification |
|----------------|--------|---------------|
| None | — | No deviations needed in this slice |

### Slice 2 — `packages/mcp-server/src/tests/tools/`

**Status:** ✅ Fixed

#### Resolved Findings

| Rule | Location | Severity | Resolution |
|------|----------|----------|---------|
| 1.4 | `packages/mcp-server/src/tests/tools/project.spec.ts:1` | MUST | Replaced real filesystem fixture creation with in-memory `node:fs` mock-backed fixtures. |
| 1.5 | `packages/mcp-server/src/tests/tools/project.spec.ts:1` | MUST | Removed shared mutable `beforeAll` state setup from tool test suites. |
| 5.5 | `packages/mcp-server/src/tests/tools/parse.spec.ts:1` | MUST | Reworked parse tool tests to deterministic static fixtures without mutable lifecycle hooks. |
| 5.5 | `packages/mcp-server/src/tests/tools/validate.spec.ts:1` | MUST | Reworked validate tool tests to deterministic static fixtures without `beforeAll`. |

#### Checklist

**Structure and behaviour (§1–§3)**
- [x] 1.1 — Tests assert on observable outputs, not implementation details
- [x] 1.2 — Test descriptions are full sentences describing behaviour, not implementation echoes
- [x] 1.3 — One logical assertion concept per test
- [x] 1.4 — No wall-clock time, randomness without seed, network, or filesystem in unit tests
- [x] 1.5 — No shared mutable state between tests; `beforeEach` resets all state
- [x] 3.3 — AAA structure with blank line separating phases
- [x] 3.4 — No branching or loops in test bodies

**Toolchain (§2)**
- [x] 2.2 — Pure functions and combinators have fast-check property tests for documented laws
- [x] 2.3 — React components tested with RTL only; no Enzyme or shallow rendering
- [x] 2.4 — Network mocked with MSW; no stubbed `fetch` or HTTP client
- [x] 2.5 — DAL tests run against real or containerised store; in-memory stubs for use-case tests
- [x] 2.6 — No snapshot tests for component structure or API response shape

**Coverage (§6)**
- [x] 6.2 — Every public export has at least one test covering the primary success case
- [x] 6.3 — Every error path (`Err`, `None`, non-2xx) has a corresponding test
- [x] 6.4 — Every branch, switch case, and ternary arm is exercised by at least one test

**Forbidden patterns (§5)**
- [x] 5.1 — No `getByTestId` queries — use `getByRole`, `getByLabelText`, `getByText`
- [x] 5.2 — No `vi.fn()` to implement a port interface — use in-memory implementations
- [x] 5.3 — No assertions on internal function calls — assert on observable outcome
- [x] 5.4 — No `any` in test code
- [x] 5.5 — No `beforeAll` for state that mutates between tests
- [x] 5.6 — No `setTimeout` delays — use `waitFor` or `findBy*`

**Factories and fixtures (§7)**
- [x] 7.1 — Test data produced by typed factory functions, not raw inline object literals
- [x] 7.2 — Factories live in `tests/factories/`, not co-located with test files
- [x] 7.4 — No production or staging IDs in fixtures

**Layer-specific (§4)**
- [x] 4.1 Core — every smart constructor tested at valid/invalid boundary values
- [x] 4.2 Use-case — each distinct `Err` variant has a test; in-memory stubs used
- [x] 4.3 Handler — each missing required field produces 422; each `ApiError` variant covered
- [x] 4.4 DAL — insert+read round-trip tested; not-found returns `None`
- [x] 4.5 React — loading state, error state, and user interactions all covered

**Annotations + Security (cross-cutting)**
- [x] No commented-out code or noisy annotations observed
- [x] No secrets, credentials, or user-input reflection vulnerabilities observed in tests

#### Deviation register

| Ref            | Line   | Justification |
|----------------|--------|---------------|
| None | — | No DEVIATION markers in this slice for the findings above |

# TEST_CODING_STANDARD.md — Functional Testing Standard

This standard is mandatory for all test code, test utilities, test configuration, comments, and documentation in the repository. English only.
Codename TSF++/Test (tsfpp-test)

**Version:** 1.0.0
**Date:** 2026-05-17
**Classification:** Normative — repository-wide
**Status:** Profile of TSF++ (`CODING_STANDARD.md`) for test code
**Modelled after:** TSF++ base standard, Kent Beck — Test-Driven Development by Example, Jessica Kerr — Property-based testing, React Testing Library guiding principles

---

## Preamble

### Relationship to TSF++

This document is a **profile** of TSF++. Every rule in `CODING_STANDARD.md` applies to test code unchanged unless a rule in this document explicitly refines it. Test code is not exempt from TSF++ rules: no `any`, no `let`, no forbidden constructs, no undocumented deviations.

Read TSF++ first. Read this second.

### Scope

This standard governs all test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`), test utilities, fixtures, factories, MSW handlers, and Storybook stories used for test purposes.

It does **not** apply to:
- Build configuration and tooling setup files.
- Generated mocks or type stubs from third-party tools.
- Seed data used exclusively for local development (not imported in tests).

---

## §1 — Principles

### Rule 1.1 — Test behaviour, not implementation
Tests assert on observable outputs and effects from the perspective of a consumer. Tests must not reach into private implementation details, internal state, or non-exported symbols.

**Good:** assert on what a function returns, what a component renders, what a handler responds with.
**Bad:** assert on which internal helper was called, what intermediate variable was set.

### Rule 1.2 — Tests are specifications
A test file is the executable specification of the unit under test. A reader who has never seen the implementation should understand the contract from the tests alone. Test descriptions must be written as full sentences describing behaviour, not as implementation echoes.

```ts
// Good
it('returns None when the input string is empty')
it('responds with 422 when the request body is missing a required field')

// Bad
it('mkTrackId empty string')
it('handler validation')
```

### Rule 1.3 — One assertion concept per test
Each test has one logical assertion — one reason to fail. Multiple `expect` calls are permitted only when they collectively verify one indivisible outcome (e.g. checking all fields of a created record).

### Rule 1.4 — Tests are deterministic
Tests produce the same result on every run in any environment. No wall-clock time, no randomness without a seeded generator, no network, no filesystem access outside designated integration test suites.

### Rule 1.5 — Tests are independent
No shared mutable state between tests. Each test constructs its own fixtures. `beforeEach` resets all mocks and stubs. Tests may run in any order.

### Rule 1.6 — Tests are fast
Unit tests complete in < 50 ms each. Integration tests may be slower but are isolated in a dedicated suite and never run on every save. Slow tests are marked with a `@slow` tag and excluded from the default test command.

---

## §2 — Toolchain

### Rule 2.1 — Standard test runner
All test suites use **Vitest** as the test runner and assertion library. Do not mix Jest and Vitest APIs.

### Rule 2.2 — Property-based testing
Pure functions and combinators are tested with **fast-check**. Unit tests cover specific cases; property tests cover the law.

```ts
import * as fc from 'fast-check'

// Unit test: specific case
it('returns the head of a non-empty array', () => {
  expect(head([1, 2, 3])).toEqual(some(1))
})

// Property test: law holds for all inputs
it('head of a non-empty array is always Some', () => {
  fc.assert(
    fc.property(fc.array(fc.integer(), { minLength: 1 }), (xs) => {
      expect(isSome(head(xs))).toBe(true)
    }),
  )
})
```

### Rule 2.3 — React component testing
React components are tested with **React Testing Library (RTL)**. Enzyme, `@testing-library/react-hooks` (deprecated), and shallow rendering are forbidden.

### Rule 2.4 — Network mocking
All HTTP network calls in tests are intercepted with **MSW** (Mock Service Worker). Stubbing `fetch`, `axios`, or any HTTP client directly is forbidden.

```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/tracks', () => HttpResponse.json(trackFixtures)),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Rule 2.5 — Database testing
Repository adapter tests run against a real or containerised database (e.g. via `testcontainers`). In-memory or SQLite substitutes are permitted only when the production database is also SQLite. Mock repository implementations used in use-case tests are in-memory implementations of the port interface, not mock objects.

### Rule 2.6 — Snapshot testing
Snapshot tests are forbidden for component structure or API response shape. Snapshots are permitted only for generated file outputs (e.g. OpenAPI specs, migration SQL) where human review of the diff is the intent.

---

## §3 — Test structure

### Rule 3.1 — Co-location
Test files live next to the file under test:

```
src/
  domain/
    track.ts
    track.test.ts          ← unit test
  infrastructure/
    track-repository.ts
    track-repository.test.ts  ← integration test
  features/
    track-list/
      TrackList.tsx
      TrackList.test.tsx    ← component test
```

Shared test utilities, factories, and MSW handlers live in `tests/` at the package root. Never in `src/` alongside production code.

### Rule 3.2 — Describe block structure
Tests are grouped with `describe` blocks that match the unit under test. Nested `describe` blocks for distinct scenarios are permitted up to two levels deep.

```ts
describe('mkTrackId', () => {
  describe('when the input is valid', () => {
    it('returns Some containing a branded TrackId', () => { ... })
  })

  describe('when the input is empty', () => {
    it('returns None', () => { ... })
  })
})
```

### Rule 3.3 — Arrange / Act / Assert
Every test body follows the AAA structure: set up preconditions, execute the unit under test, assert on the outcome. A blank line separates each phase.

```ts
it('returns None when the input string is empty', () => {
  const raw = ''

  const result = mkTrackId(raw)

  expect(result).toEqual(none)
})
```

### Rule 3.4 — No logic in tests
Tests contain no branching (`if`, `switch`), loops, or non-trivial computation. If shared setup is complex, extract a typed factory function.

---

## §4 — What to test per layer

### Rule 4.1 — Core (domain) layer
Test every exported function. For pure functions, provide both example-based and property-based tests. Laws documented in JSDoc (`@law`) must have a corresponding property test.

| What | How |
|---|---|
| Smart constructors | Valid input → `Some`/`Ok`; invalid input → `None`/`Err` — cover boundary values |
| Pure transformations | Input/output pairs + fast-check laws |
| Exhaustive switch | Each variant produces the correct output |
| Branded type invariants | Property: the predicate holds for all accepted values |

```ts
// Law test — identity
it('satisfies the identity law: map(id) ≡ id', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => {
      expect(pipe(ok(n), map(x => x))).toEqual(ok(n))
    }),
  )
})
```

### Rule 4.2 — Use-case layer
Test use-cases against in-memory port implementations (not mocks). Cover the success path, each distinct error path, and any invariant the use-case enforces.

```ts
// In-memory repository stub — implements the port, not a mock object
const repo = mkInMemoryTrackRepository()
const useCase = createTrackUseCase({ repo })

it('returns Ok containing the created track on valid input', async () => {
  const input = { title: 'Test', artistId: mkArtistId('a1') }

  const result = await useCase.execute(input)

  expect(isOk(result)).toBe(true)
})
```

### Rule 4.3 — API / handler layer
Test handlers by calling them with a real `Request` and asserting on the `Response`. Use MSW or a local test server; do not call internal handler functions directly.

| What | How |
|---|---|
| Validation | Send a body with each required field missing; assert 422 |
| Success paths | Send valid input; assert status code, `Location` header, body shape |
| Error mapping | Force the use-case to return each `ApiError` variant; assert HTTP status |
| Auth | Omit / forge credentials; assert 401 or 403 |

```ts
it('responds with 422 when title is missing', async () => {
  const req = new Request('http://localhost/v1/tracks', {
    method: 'POST',
    body: JSON.stringify({ artistId: 'a1' }),
    headers: { 'Content-Type': 'application/json' },
  })

  const res = await handler(req)

  expect(res.status).toBe(422)
})
```

### Rule 4.4 — DAL / repository layer
Test repository adapters against a real or containerised data store. Each test operates in a transaction that is rolled back on teardown.

| What | How |
|---|---|
| Insert + read round-trip | Insert a record; read it back; assert field equality |
| Not-found | Query a non-existent ID; assert `None` |
| Mapping | Insert a record with boundary values (nulls, max lengths); assert correct `Option` mapping |
| Error cases | Simulate a constraint violation; assert typed `DataError` |

### Rule 4.5 — React component layer
Test components from the user's perspective using RTL.

| What | How |
|---|---|
| Rendering | Assert visible text and accessible roles are present |
| Interaction | `userEvent` to trigger clicks, typing, form submission |
| Loading state | Assert skeleton or spinner is shown while query is pending |
| Error state | Assert error message is shown when query fails |
| Accessibility | Assert focus management, ARIA attributes, keyboard interaction |

```ts
it('shows a loading indicator while the track list is fetching', async () => {
  server.use(http.get('/api/tracks', () => new Promise(() => {}))) // never resolves

  render(<TrackList />)

  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
})
```

---

## §5 — Forbidden patterns

### Rule 5.1 — No `data-testid`
Query by accessible role, label, or text. `data-testid` queries are forbidden. Exception: `getByTestId` is permitted in Storybook play functions only, with a `// DEVIATION(5.1): Storybook play function` comment.

### Rule 5.2 — No mock objects for ports
Do not use `vi.fn()` to implement a port interface. Provide an in-memory implementation that satisfies the full interface contract. `vi.fn()` is permitted for standalone callback assertions (`onClose`, `onSelect`) only.

```ts
// Good — in-memory implementation
const repo = mkInMemoryTrackRepository()

// Bad — partial mock object
const repo = { findById: vi.fn().mockResolvedValue(track) }
```

### Rule 5.3 — No implementation assertions
Do not assert that an internal function was called. Assert on the observable outcome.

```ts
// Good
expect(await repo.findById(id)).toEqual(some(track))

// Bad
expect(dbClient.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
```

### Rule 5.4 — No `any` in test code
Test code is subject to the same `any` prohibition as production code. Use typed fixtures and typed factory functions.

### Rule 5.5 — No `beforeAll` for state that changes between tests
`beforeAll` is permitted only for one-time setup that is truly immutable across the suite (server startup, schema creation). Any state that a test might mutate must be reset in `beforeEach`.

### Rule 5.6 — No `setTimeout` or `waitFor` polling loops
Do not use arbitrary `setTimeout` delays to wait for async work. Use `waitFor`, `findBy*` queries, or `userEvent` which handles async interactions correctly.

---

## §6 — Coverage

### Rule 6.1 — Coverage is a floor, not a target
Minimum enforced coverage: **80 % statements, 80 % branches** per package. Coverage above the floor is not a goal in itself — untested behaviour is the problem, not an uncovered line.

### Rule 6.2 — Every public export has at least one test
Every exported function, component, and type constructor must have at least one test covering its primary success case. Untested exports block merge.

### Rule 6.3 — Every error path has a test
Every `Err`, `None`, and non-2xx response that the code can produce must have a corresponding test. Error-path coverage is not optional.

### Rule 6.4 — Branch coverage for conditional logic
Every `if` branch, every `switch` case, and every ternary arm in production code must be exercised by at least one test. `default: return absurd(x)` branches are excluded — they are exhaustiveness witnesses, not reachable paths.

### Rule 6.5 — Coverage exemptions
Files may be excluded from coverage only with a `/* istanbul ignore file */` comment and an entry in `DEVIATIONS.md` explaining why. Auto-generated files and pure re-export barrels are exempt by default.

---

## §7 — Test data and factories

### Rule 7.1 — Typed factory functions over raw literals
Test data is produced by typed factory functions, not by raw object literals scattered across test files.

```ts
// Good — factory with overrides
const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  id:       mkTrackId('default-id'),
  title:    'Default Title',
  artistId: mkArtistId('default-artist'),
  ...overrides,
})

// Bad — raw literal duplicated in every test
const track = { id: 'abc', title: 'Test', artistId: 'xyz' }
```

### Rule 7.2 — Factories live in `tests/`
Factory functions are not co-located with test files. They live in `tests/factories/` at the package root and are imported wherever needed.

### Rule 7.3 — Fixtures are typed and readonly
All fixture data is typed with the domain type and declared `as const` or with `readonly` fields.

### Rule 7.4 — No production-database IDs in fixtures
Fixture IDs are deterministic strings that could never collide with real data (e.g. `'test-track-001'`). Never copy real IDs from a production or staging environment into test fixtures.

---

## §8 — TDD workflow

### Rule 8.1 — Red before green
No production code is written before a failing test exists for the behaviour it implements. The test must fail for the right reason (assertion failure, not a compile error or import error).

### Rule 8.2 — Minimal implementation
The first passing implementation is the simplest code that makes the test green. Generalization follows only when a second test forces it (triangulation).

### Rule 8.3 — Refactor under green
Refactoring happens only when all tests are green. A test suite that is red is not a valid starting point for a refactor.

### Rule 8.4 — Commit at green
Each green + refactor cycle is a commit. Commits must not contain both a failing test and production code that makes it pass in the same diff. The failing test is committed first; the passing implementation second.

---

## Appendix A — Tool summary

| Layer | Unit tests | Property tests | Network | DB |
|---|---|---|---|---|
| Core | Vitest | fast-check | — | — |
| Use-case | Vitest | fast-check (optional) | — | In-memory stub |
| API / handler | Vitest | — | MSW | In-memory stub |
| DAL | Vitest | — | — | Real / containerised |
| React | Vitest + RTL | — | MSW | — |

## Appendix B — Forbidden tool list

| Tool | Reason |
|---|---|
| Enzyme | Encourages implementation testing |
| `jest.mock()` module factory for ports | Bypasses type safety of the port contract |
| `sinon` | Redundant with Vitest built-ins |
| `nock` / `axios-mock-adapter` | Superseded by MSW |
| `shallow` rendering | Encourages implementation testing |
| `data-testid` queries | Bypasses accessibility contract |
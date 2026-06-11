# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- No unreleased changes yet.

## [1.2.0] - 2026-05-20

### Added
- Added core boundary primitives and helper APIs.
- Added configuration boundary documentation and release prep updates.
- Added modular boundary exports for focused modules (`boundary-types`, `boundary-response`, `boundary-operations`, `boundary-idempotency`, `boundary-webhook`, `boundary-node`).
- Added handler helper APIs: `createHandler`, `createJsonHandler`, `parseJsonBody`, `parseJsonWithSchema`, `mkNextCursor`, and `parsePaginationFromRequest`.

### Changed
- Reworked the package surface from a monolithic `boundary.ts` implementation to a module-based barrel while preserving public exports.
- Updated README and RECIPES examples to current API forms (`mkProblem({ ... })`, helper-driven handler composition) and order/customer domain flows.

## [1.1.0] - 2026-05-18

### Added
- Added configuration boundary helpers: `loadConfig`, `EnvSchema<T>`, and `ConfigError`.
- Added configuration recipes and README docs for startup-time env validation.

## [1.0.1] - 2026-05-15

### Added
- Added package keywords in `package.json` for improved discoverability.

### Changed
- Replaced local coding-standard references with `@tsfpp/standard` links in docs.

### Removed
- Removed local `API_CODING_STANDARD.md` from this package.

## [1.0.0] - 2026-05-14

### Added
- Initial package scaffolding and public API surface for boundary primitives.

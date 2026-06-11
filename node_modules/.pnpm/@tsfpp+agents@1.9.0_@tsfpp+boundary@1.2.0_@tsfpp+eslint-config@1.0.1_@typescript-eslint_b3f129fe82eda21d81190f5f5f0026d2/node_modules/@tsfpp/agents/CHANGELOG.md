# Changelog - @tsfpp/agents

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [1.9.0] - 2026-05-28

### Features

- `feat(build): compile Copilot, workflow, and Claude assets from ai sources` — Build output now compiles Copilot instructions and GitHub workflows from canonical `ai/` sources, with Claude context sourced from `ai/claude/tsfpp.md` and deployed to `.claude/tsfpp.md`.
- `feat(agents): add MCP-driven guidance across agents, instructions, and skills` — Added always-on MCP instruction routing and integrated tool-first flows (`get_rule`, `get_layer`, `get_pattern`, `get_deviation`, `check_pattern`, `get_api_surface`) in TSF++ agents and skill guidance.

### Chores

- `chore(repo): stop tracking generated compatibility outputs` — Removed tracked generated `.ai/` and `.github/` compatibility assets from this package repository, keeping only source files and runtime workflow output policy.
- `chore(package): add optional @tsfpp/mcp-server peer dependency` — MCP server is now declared as an optional peer to signal enhanced integration without making installation a hard requirement.

### Documentation

- Updated README to document canonical `ai/` source locations, generated client outputs, and repository tracking policy for generated compatibility files.
- Clarified README MCP behavior as progressive enhancement: package remains usable without MCP, while connected mode provides authoritative tooling.

## [1.8.0] - 2026-05-25

### Features

- `feat(agents): compile ai sources into .ai during init` — Bootstrapped projects now use `.ai/` as the editable AI source tree while `.github/` remains a generated compatibility layer.

## [1.7.3] - 2026-05-20

### Documentation

- `docs(boundary-api): update skill guide and instructions for v1.2.0 handler APIs` — Boundary API guidance now reflects the v1.2.0 handler-helper flow, including config loading and Node adapter usage.
- `docs(prelude): refine instructions and update logger port types` — Prelude guidance now uses cleaner import patterns and streamlined Option/Result examples for day-to-day implementation.

## [1.7.2] - 2026-05-20

### Chores

- `chore(agents): enforce AAA formatting and improve escalation policy` — Test-writing agents now mandate blank lines between Arrange/Act/Assert phases; guarded-coding agent applies known violations immediately instead of requesting permission.

## [1.7.1] - 2026-05-19

### Features

- `feat(agents): improve init and bootstrap release workflow` - Installer setup now merges Copilot instructions safely, initializes release manifest metadata, and includes bootstrap scripts in package outputs.
- `feat(agents): add debugging and trunk commit agents` - Added `tsfpp-debug` and `trunk-commit` agent definitions for Copilot workflows.
- `feat(init): deploy additional trunk and debug agents` - `init.mjs` now installs `tsfpp-debug`, `trunk-commit`, `trunk-enforcer`, and `trunk-release` into `.github/agents`.
- `feat(agents): improve trunk commit automation flow` - Renamed the Copilot agent to `tsfpp-trunk-commit`, added push/PR automation guidance, and made validation script checks conditional on configured package scripts.
- `feat(agents): improve GitHub trunk commit automation flow` - Updated the `.github` trunk commit agent with `tsfpp-trunk-commit` naming, push/PR automation steps, and script-aware pre-commit validation checks.
- `feat(bootstrap): scaffold README and changelog in generated projects` - Bootstrapped projects now include ready-to-use documentation files and clearer package metadata defaults.

### Bug fixes

- `fix(bootstrap): run setup non-interactively` - Bootstrap now suppresses `pnpm init` noise and uses `init.mjs --yes` so setup can complete unattended.
- `fix(agents): restore trunk-commit agent name` - Copilot users can invoke the trunk commit workflow using the expected `trunk-commit` agent name.

### Documentation

- Updated `README.md` agent and installation inventory to include the new debugging and trunk commit agents.
- Added explicit Option and Result assertion guidance to `tsfpp-tdd`, `tsfpp-backfill-tests`, and the test standard skill.

## [1.7.0] - 2026-05-19

### Features

- **agents:** improve init and bootstrap release workflow ([`916cf76`](https://github.com/tsfpp/agents/commit/916cf76c584026df148dacd6507bca6b8c2dfafb))
- **agents:** improve init and bootstrap release workflow ([`954b4c4`](https://github.com/tsfpp/agents/commit/954b4c454f77c8ce59357dde09f25f74f8c1d19d))
- **release:** add config/log standards and bump to v1.5.0 ([`71d678b`](https://github.com/tsfpp/agents/commit/71d678b7e10f444082f318921061580f69605c47))
- **core:** add annotation standard skill and align agents ([`8a05614`](https://github.com/tsfpp/agents/commit/8a056145ad5c5d0d50484302f61578c83c64d472))
- **core:** add test backfill agent and tighten guidance ([`14ff506`](https://github.com/tsfpp/agents/commit/14ff506d6f37073e95c7aa65c7c4321ef59eee29))
- **core:** release v1.3.0 with expanded coding and testing guidance ([`65ec6d0`](https://github.com/tsfpp/agents/commit/65ec6d00224f9cb4950b2d672685ae83a7324197))
- **core:** add trunk workflow assets and bump version to 1.2.0 ([`6382624`](https://github.com/tsfpp/agents/commit/6382624b3bc4d8447cfcf6fccb58572897dea956))
- **core:** add Copilot skills deployment and bump to 1.1.0 ([`53f223f`](https://github.com/tsfpp/agents/commit/53f223f57bf9ea4d394aea49969d877fb3582646))

### Bug fixes

- **core:** resolve init.mjs duplicate symbol bug ([`083d1f5`](https://github.com/tsfpp/agents/commit/083d1f50e8d19e1dd1675fc29ca4fe467624073c))
- **core:** release v1.3.1 with test skill and init updates ([`eab0c9a`](https://github.com/tsfpp/agents/commit/eab0c9a93698634cd9820cf1de7aca5a1bf065a4))
- **release:** switch audit update to patch v1.2.3 ([`f75de64`](https://github.com/tsfpp/agents/commit/f75de6413cb6681eeedbef1ffe7825da530304ef))
- **core:** harden init questionnaire idempotency and ctrl-c handling ([`63a99fd`](https://github.com/tsfpp/agents/commit/63a99fd10bf80cd45a30b4b934c460aeac9ee1dc))
- **core:** resolve init eslint declaration idempotency bug ([`e0b2c17`](https://github.com/tsfpp/agents/commit/e0b2c173c136b849718e6c5982e0ca646b30e6c0))
- **core:** bump patch release for bootstrap script packaging ([`3ac6a53`](https://github.com/tsfpp/agents/commit/3ac6a5334c1dc77e7469cd2adea0f278b41fd071))
- **core:** normalize agent names and bump patch release ([`d4e097b`](https://github.com/tsfpp/agents/commit/d4e097bf4221497ecfabf405da66dbc7c6588dcb))
- **release:** standard spec paths and init eslint/tsconfig setup ([`4193964`](https://github.com/tsfpp/agents/commit/419396451c48e0a226393acc770e5d0b8296c2ee))
- **release:** prepare 1.0.1 patch ([`96f0d33`](https://github.com/tsfpp/agents/commit/96f0d3343d1b2533109e57fb2ec0055a5fd18ffc))
- **ci:** quote workflow trigger key ([`47baf47`](https://github.com/tsfpp/agents/commit/47baf4708d6480636083018dd84074a10ec26851))

## [1.6.0] - 2026-05-18

### Features

- **agents:** improve init and bootstrap release workflow ([`916cf76`](https://github.com/tsfpp/agents/commit/916cf76c584026df148dacd6507bca6b8c2dfafb))
- **agents:** improve init and bootstrap release workflow ([`954b4c4`](https://github.com/tsfpp/agents/commit/954b4c454f77c8ce59357dde09f25f74f8c1d19d))
- **release:** add config/log standards and bump to v1.5.0 ([`71d678b`](https://github.com/tsfpp/agents/commit/71d678b7e10f444082f318921061580f69605c47))
- add annotation standard skill and align agents ([`8a05614`](https://github.com/tsfpp/agents/commit/8a056145ad5c5d0d50484302f61578c83c64d472))
- add test backfill agent and tighten guidance ([`14ff506`](https://github.com/tsfpp/agents/commit/14ff506d6f37073e95c7aa65c7c4321ef59eee29))
- release v1.3.0 with expanded coding and testing guidance ([`65ec6d0`](https://github.com/tsfpp/agents/commit/65ec6d00224f9cb4950b2d672685ae83a7324197))
- add trunk workflow assets and bump version to 1.2.0 ([`6382624`](https://github.com/tsfpp/agents/commit/6382624b3bc4d8447cfcf6fccb58572897dea956))
- add Copilot skills deployment and bump to 1.1.0 ([`53f223f`](https://github.com/tsfpp/agents/commit/53f223f57bf9ea4d394aea49969d877fb3582646))

### Bug fixes

- resolve init.mjs duplicate symbol bug ([`083d1f5`](https://github.com/tsfpp/agents/commit/083d1f50e8d19e1dd1675fc29ca4fe467624073c))
- release v1.3.1 with test skill and init updates ([`eab0c9a`](https://github.com/tsfpp/agents/commit/eab0c9a93698634cd9820cf1de7aca5a1bf065a4))
- **release:** switch audit update to patch v1.2.3 ([`f75de64`](https://github.com/tsfpp/agents/commit/f75de6413cb6681eeedbef1ffe7825da530304ef))
- harden init questionnaire idempotency and ctrl-c handling ([`63a99fd`](https://github.com/tsfpp/agents/commit/63a99fd10bf80cd45a30b4b934c460aeac9ee1dc))
- resolve init eslint declaration idempotency bug ([`e0b2c17`](https://github.com/tsfpp/agents/commit/e0b2c173c136b849718e6c5982e0ca646b30e6c0))
- bump patch release for bootstrap script packaging ([`3ac6a53`](https://github.com/tsfpp/agents/commit/3ac6a5334c1dc77e7469cd2adea0f278b41fd071))
- normalize agent names and bump patch release ([`d4e097b`](https://github.com/tsfpp/agents/commit/d4e097bf4221497ecfabf405da66dbc7c6588dcb))
- **release:** standard spec paths and init eslint/tsconfig setup ([`4193964`](https://github.com/tsfpp/agents/commit/419396451c48e0a226393acc770e5d0b8296c2ee))
- **release:** prepare 1.0.1 patch ([`96f0d33`](https://github.com/tsfpp/agents/commit/96f0d3343d1b2533109e57fb2ec0055a5fd18ffc))
- **ci:** quote workflow trigger key ([`47baf47`](https://github.com/tsfpp/agents/commit/47baf4708d6480636083018dd84074a10ec26851))

## [1.5.0] - 2026-05-18

### Added

- Added `copilot/skills/config-standard/SKILL.md`.
- Added `copilot/skills/log-standard/SKILL.md`.

### Changed

- Updated `README.md` with latest guidance updates.
- Updated `copilot/agents/tsfpp-audit.agent.md` with expanded checks and release hygiene.
- Updated `copilot/agents/tsfpp-guarded-coding.agent.md` with guarded workflow refinements.
- Updated `copilot/instructions/tsfpp-base.instructions.md` with aligned base-level standards guidance.
- Updated `init.mjs` to include installer wiring for newly added skills and updates.

## [1.4.0] - 2026-05-18

### Added

- Added `copilot/prompts/trunk-changelog.prompt.md` to support trunk-based changelog authoring.
- Added `copilot/skills/annotation-standard/SKILL.md` to standardize annotation workflow and conventions.

### Changed

- Updated `README.md` with rationale updates and new LLM assets/flowchart documentation.
- Updated `init.mjs` to include deployment wiring for the new trunk changelog prompt and related README/documentation flow.
- Updated `copilot/agents/tsfpp-annotate.agent.md` to align with the annotation standard.
- Updated `copilot/agents/tsfpp-audit.agent.md` to include annotation-standard-aware checks.
- Updated `copilot/agents/tsfpp-guarded-coding.agent.md` to route annotation work through the standard.

## [1.3.5] - 2026-05-18

### Changed

- Fixed an `init.mjs` regression by restoring the main-clause wrapper to prevent dangling awaits and improve idempotent handling of existing files.
- Updated `tdd` and `backfill-tests` agents to include a standards-enforcing self-review step.
- Expanded `audit` agent checklist coverage with an extensive backfill of checklist items.

## [1.3.4] - 2026-05-18

### Changed

- Updated `audit`, `backfill-tests`, and `refactor-engineer` so they do not hand off too easily when workable slices of implementation are readily available.
- Updated audit/backfill log filename convention to include both time and focus.
- Improved handover flow from `backfill-tests` to `audit`.
- Added additional summary domains to report on in the audit log.

## [1.3.3] - 2026-05-17

### Added

- Added `copilot/agents/tsfpp-backfill-tests.agent.md` for creating tests in codebases that currently have no tests.
- Added `copilot/prompts/trunk-init-repo.prompt.md` for guided trunk-based repository initialization.

### Fixed

- Minor fixes on idempotency of `init.mjs` files.
- Minor convenience fix for `refactor-engineer`.

### Changed

- Updated `copilot/agents/tsfpp-audit.agent.md` to enforce inverse `undefined` checks as well, preventing shortcut patterns we do not want agents to use.
- Updated `copilot/copilot-instructions.md` for the same anti-shortcut rationale.
- Updated `copilot/instructions/tsfpp-base.instructions.md` for the same anti-shortcut rationale.
- Updated `init.mjs` accordingly to include deployment/support for `copilot/agents/tsfpp-backfill-tests.agent.md`.
- Updated `bin/bootstrap.sh` to improve bootstrap workflow behavior and script robustness.

## [1.3.2] - 2026-05-17

### Fixed

- Fixed `init.mjs` duplicate symbol bug by removing a duplicate `writeEslintConfig` declaration.

## [1.3.1] - 2026-05-17

### Added

- Added `copilot/skills/test-standard/SKILL.md`.

### Changed

- Updated `init.mjs` to include previously missing changes.

## [1.3.0] - 2026-05-17

### Added

- Added `copilot/instructions/tsfpp-testing.instructions.md` following the release of the new testing standard.
- Added `copilot/agents/tsfpp-tdd.agent.md` for dedicated test-first workflow that writes failing, proper tests before implementation starts.

### Changed

- Updated `copilot/agents/tsfpp-guarded-coding.agent.md` to include multi-layer request focus.
- Updated `copilot/agents/tsfpp-guarded-coding.agent.md` to enforce a prelude-first rule before execution workflow as a hard reflex, not an afterthought.
- Updated `copilot/agents/tsfpp-audit.agent.md` so focus `api` applies both API_CODE_STANDARD rules and prefers `boundary` idioms over hand-rolled repeats.
- Updated `copilot/agents/tsfpp-audit.agent.md` to strengthen checks for Prelude anti-patterns.
- Updated `copilot/agents/tsfpp-audit.agent.md` to support focus `test`.
- Updated `copilot/agents/tsfpp-guarded-coding.agent.md` to hand off to `tsfpp-tdd` before starting implementation.
- Expanded `copilot/instructions/tsfpp-base.instructions.md`: replaced `brand()` with the correct smart-constructor `as` idiom, added a discriminant-convention table, and added `new Map()`/`new Set()`/`try-catch`/`null` checks to the Never list.
- Expanded `copilot/instructions/tsfpp-prelude.instructions.md`: added `ReadonlyMap`/`ReadonlySet`, unknown record decoding helpers (`isRecord`, `getStringField`, etc.), `fromUnknownArrayOf`, `sequenceArrayO`, `isCons`/`isNil`, and `UnknownRecord`; removed `brand()` and removed `mapErr` (not in `fp-ts`); added a `pipe` vs `flow` section.
- Expanded `copilot/instructions/tsfpp-api.instructions.md`: fixed the `fromZodError` + `fold` error path to `apiErrorToResponse(fromZodError(e), ctx)`, completed the import list, added middleware composition via `pipe`, and documented pagination, rate limiting, CORS, bulk operations, LROs, and `cause` warnings for internal/dependency errors.
- Expanded `copilot/instructions/tsfpp-react.instructions.md`: corrected memoization guidance (no speculative memoization), added a state-elimination ladder, expanded effect discipline with explicit do/don't examples, and added guidance for TanStack Query key factories, RHF + Zod, typed router usage, narrow Zustand selectors, `cva`/`cn` styling, plus a complete Forbidden list.

### Fixed

- Fixed `copilot/copilot-instructions.md` after an earlier overwrite that incorrectly replaced it with API-only instructions.

## [1.2.3] - 2026-05-16

### Added

- Added `react` and `data` as supported focus values for `copilot/agents/tsfpp-audit.agent.md`.
- Added Data profile overlay support via `node_modules/@tsfpp/standard/spec/DATA_CODING_STANDARD.md`.

### Changed

- Updated TSF++ standard reference paths in `copilot/agents/tsfpp-audit.agent.md` to `node_modules/@tsfpp/standard/spec/*.md`.
- Updated audit startup prompt and argument hints to include React and Data focused targets.

### Removed

- Removed checklist rule `8.x` (prelude ADT/helper reuse enforcement) from the base audit template.
- Simplified checklist rule `9.x` from broad dependency hygiene checks to a direct `ramda` import guard.

## [1.2.2] - 2026-05-16

### Fixed

- Updated `init.mjs` questionnaire flow to avoid overwriting existing `tsconfig` and ESLint config files.
- Added `N`/skip escape hatch for existing-file prompts.
- Added `SIGINT` handling by wrapping execution in `main` so Ctrl+C exits cleanly without hanging awaits.

## [1.2.1] - 2026-05-16

### Fixed

- Fixed an `init.mjs` idempotency bug in ESLint config declaration handling.

## [1.2.0] - 2026-05-16

### Added

- Added trunk-based development Copilot agents:
  - `copilot/agents/trunk-enforcer.agent.md`
  - `copilot/agents/trunk-release.agent.md`
- Added trunk workflow instruction file:
  - `copilot/instructions/trunk.instructions.md`

### Changed

- Updated `init.mjs` to deploy the new trunk agent/instruction files.
- Improved `init.mjs` idempotency and overwrite confirmation behavior.

## [1.1.1] - 2026-05-16

### Added

- Added bootstrap shell script at `bin/bootstrap.sh`.
- Exposed bootstrap command in package metadata via `tsfpp-bootstrap`.

## [1.1.0] - 2026-05-16

### Added

- Updated `init.mjs` to deploy Copilot reusable skills into `.github/skills/`.
- Added Copilot reusable skills to installer output:
  - `copilot/skills/coding-standard/SKILL.md`
  - `copilot/skills/prelude-api/SKILL.md`
  - `copilot/skills/boundary-api/SKILL.md`
  - `copilot/skills/react-coding-standard/SKILL.md`

## [1.0.3] - 2026-05-16

### Changed

- Fixed agent names across Copilot agent definition files.

## [1.0.2] - 2026-05-15

### Changed

- Fixed standards path references across Claude and Copilot guidance files to include the missing `spec/` segment.
- Updated all references in this package to point to `@tsfpp/standard/spec/*` paths.
- Improved `init.mjs` setup flow for both existing codebases and greenfield projects by adding better ESLint and tsconfig handling.

## [1.0.1] - 2026-05-15

### Changed

- Updated `init.mjs` to copy `CLAUDE.md` into `.claude/` instead of placing it at project root.
- Updated `README.md` to reflect the installer behavior and usage details.

### Migration

- If upgrading from `1.0.0`, remove root-level `CLAUDE.md`. The installer now places it at `.claude/CLAUDE.md`.

## [1.0.0] - 2026-05-15

### Added

- Initial release of `@tsfpp/agents`.
- CLI installer (`init.mjs`) and executable bin (`tsfpp-agents`) for installing AI tooling files into consumer projects.
- Copilot workspace instruction baseline in `copilot/copilot-instructions.md`.
- Copilot instruction files:
  - `copilot/instructions/tsfpp-base.instructions.md`
  - `copilot/instructions/tsfpp-prelude.instructions.md`
  - `copilot/instructions/tsfpp-react.instructions.md`
  - `copilot/instructions/tsfpp-api.instructions.md`
- Copilot specialized agents:
  - `copilot/agents/tsfpp-guarded-coding.agent.md`
  - `copilot/agents/tsfpp-audit.agent.md`
  - `copilot/agents/tsfpp-refactor-engineer.agent.md`
  - `copilot/agents/tsfpp-annotate.agent.md`
- Copilot reusable prompts:
  - `copilot/prompts/tsfpp-new-module.prompt.md`
  - `copilot/prompts/tsfpp-boundary-review.prompt.md`
- Claude Code project context in `claude/CLAUDE.md`.
- Automated release workflow using Release Please:
  - `.github/workflows/release-please.yml`
  - `release-please-config.json`
  - `.release-please-manifest.json`

[Unreleased]: https://github.com/tsfpp/agents/compare/v1.7.2...HEAD
[1.7.2]: https://github.com/tsfpp/agents/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/tsfpp/agents/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/tsfpp/agents/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/tsfpp/agents/compare/v1.5.0...v1.6.0

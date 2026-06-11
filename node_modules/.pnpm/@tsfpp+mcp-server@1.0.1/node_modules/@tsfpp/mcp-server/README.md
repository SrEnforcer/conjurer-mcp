# @tsfpp/mcp-server

Model Context Protocol (MCP) server for TSF++ standards.

This project exposes TSF++ rules, layers, patterns, deviations, API surface guidance, and forbidden construct checks as MCP tools and resources.

## What this server provides

Tools:
- get_rule
- get_layer
- search_rules
- get_pattern
- get_deviation
- get_api_surface
- check_pattern
- list_forbidden

Resources:
- TSF++ standard markdown documents from @tsfpp/standard, exposed through tsfpp://standard/* URIs.

## Requirements

- Node.js 20+
- pnpm 10+

## Install

```bash
pnpm install
```

## Development scripts

```bash
pnpm check
pnpm typecheck
pnpm lint
pnpm check:test
pnpm typecheck:test
pnpm lint:test
```

## Run the MCP server (stdio)

```bash
pnpm mcp:serve
```

Equivalent alias:

```bash
pnpm mcp:serve:stdio
```

Entry point: [bin/tsfpp-mcp.ts](bin/tsfpp-mcp.ts)

## Use this MCP server in this same workspace

This repository includes VS Code MCP registration at [.vscode/mcp.json](.vscode/mcp.json), so the workspace can run and use its own server for self-analysis.

Server name in config:
- tsfpp-mcp-server-self

## Project layout

- [src/types.ts](src/types.ts): shared domain model
- [src/lib/rule-index.ts](src/lib/rule-index.ts): standard markdown parser and immutable index builder
- [src/lib/standard-paths.ts](src/lib/standard-paths.ts): canonical TSF++ spec paths
- [src/lib/package-reader.ts](src/lib/package-reader.ts): installed package README/RECIPES loader
- [src/tools](src/tools): pure tool logic
- [src/resources/standard-resources.ts](src/resources/standard-resources.ts): static MCP resource catalog
- [src/server.ts](src/server.ts): MCP tool/resource registration and server assembly
- [src/index.ts](src/index.ts): public package exports
- [tests/factories](tests/factories): shared test helpers

## Release process

This repo is configured for release-please (manifest mode):
- [release-please-config.json](release-please-config.json)
- [release-please-manifest.json](release-please-manifest.json)
- [.github/workflows/release-please.yml](.github/workflows/release-please.yml)

Current package version is managed in:
- [package.json](package.json)
- [CHANGELOG.md](CHANGELOG.md)
- [release-please-manifest.json](release-please-manifest.json)

## Notes

- The implementation follows strict TSF++ standards and annotation rules.
- Test files are colocated with source files; shared fixtures/helpers stay under [tests/factories](tests/factories).

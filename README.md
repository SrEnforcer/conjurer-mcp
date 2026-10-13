# conjurer-mcp

A deterministic [Model Context Protocol](https://modelcontextprotocol.io) server that gives an IDE-resident agent exact access to the [Conjurer](https://github.com/SrEnforcer/conjurer) specification and to `.cnj` project files, plus a companion VS Code extension.

The server retrieves, parses, validates and plans. It contains no language model: everything semantic or generative is left to the IDE's own model. When it cannot resolve something, it says so instead of guessing.

## Packages

| Package | Path | Role |
|---|---|---|
| `@conjurer/core` | `packages/shared-core` | EDN parser, spec reader, `.cnj` model, validation, workspace planning. Shared by the server and the extension. |
| `@conjurer/mcp-server` | `packages/mcp-server` | Thin MCP wiring over the core. stdio transport only. |
| `conjurer-mcp` (extension) | `packages/vscode-extension` | Hover docs, CodeLens, folding, validation and folder materialisation for `.cnj` files. |

## Getting started

Requires Node.js 18 or later and pnpm 10.

```sh
pnpm install
pnpm build
```

The server is then at `packages/mcp-server/dist/server.js`.

### Connect it to an MCP client

The repository's `.mcp.json` registers the server for clients that read it from the project root (Claude Code, for one):

```json
{
  "mcpServers": {
    "conjurer-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"]
    }
  }
}
```

For a client started elsewhere, use the absolute path to `server.js`.

### Where the specification comes from

The server reads the specification live, so spec updates need no rebuild. It looks, in order, for:

1. `CONJURER_SPEC_PATH`, when that directory holds an `index.edn`;
2. a sibling checkout named `conjurer-spec` or `conjurer` beside this repository;
3. the installed `conjurer-spec` package, pinned in `packages/shared-core/package.json` to a tagged release of [SrEnforcer/conjurer](https://github.com/SrEnforcer/conjurer).

To work against an unreleased spec, clone `conjurer` next to this repository or set `CONJURER_SPEC_PATH`.

## Tools

All tools are deterministic. `packages/mcp-server/src/server.ts` is the authoritative list; each tool's input and output contract is a spell in `design/mcp-server.cnj`.

| Cluster | Tools |
|---|---|
| A — retrieval | `lookup_symbol`, `search_symbols`, `get_grimoire_section`, `get_examples`, `list_grimoire`, `check_symbol_coverage`, `trace_symbol`, `explain_form` |
| B — parsing and diff | `parse_cnj`, `read_charter`, `diff_cnj`, `diff_candidates` |
| C — validation | `validate_cnj` (`authored` or `recovered` mode), `lint_disk_consistency` |
| D — project planning | `resolve`, `evaluate`, `project_lint_topology`, `materialise_preflight`, `materialise_plan`, `lens_dependency_graph`, `lens_open_questions`, `workspace_summary` |
| F — foresight | `list_candidates`, `lens_hoist_readiness`, `lens_foresight_health` |
| Postconditions | `check_postconditions` |

Grimoires are also exposed as read-only MCP resources at `conjurer://grimoire/<name>`.

### Preflight before generation

Materialisation has two halves. Preflight (`materialise_preflight`, `resolve`, `materialise_plan`) is deterministic: it resolves references, orders dependencies and reports gaps. Generation is semantic and belongs to the IDE's model. The server halts on unresolved references rather than let a caller generate against an incomplete plan.

## VS Code extension

The extension activates in any workspace containing a `.cnj` file. It offers hover documentation and CodeLens for spec symbols, folding, a foresight status bar item, and the commands below (all under **Conjurer:** in the command palette):

- Look up symbol, Search symbols, Describe symbol
- Validate current .cnj, Show open questions
- Materialise folder (also on a folder's context menu in the explorer)
- Refine form with AI, Resolve open questions with AI — these build a prompt and hand it to the IDE's chat; the extension itself calls no model.

Build an installable package with:

```sh
pnpm --filter conjurer-mcp package
```

## Development

```sh
pnpm build         # core first, then the server and the extension
pnpm typecheck
pnpm lint
pnpm test
pnpm check:design  # run the built server over design/*.cnj
```

CI runs all five on every pull request.

The design lives in `design/` as `.cnj` files and is the source of truth; `.claude/CLAUDE.md` orients contributors to it and records the conventions (module size limits, no stdout on the stdio transport, no embedded spec content). Code follows the TSF++ standard from the `@tsfpp/*` packages.

## Releases

Releases are cut by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org) on `main`. One version covers the whole monorepo; tags read `vX.Y.Z`, and the changes are listed in `CHANGELOG.md`.

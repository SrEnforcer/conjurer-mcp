# @tsfpp/agents

Universal AI source files and project bootstrap tooling for TSF++ projects.

This package keeps the editable source tree in `ai/` and compiles it into project-local output during installation or bootstrap.

## Source vs output

Source files in this repository:
- `ai.md`
- `ai/copilot-instructions.md`
- `ai/claude/`
- `ai/agents/`
- `ai/instructions/`
- `ai/instructions/tsfpp-mcp.instructions.md`
- `ai/prompts/`
- `ai/skills/`
- `ai/workflows/`

Generated output in a consuming project:
- `.ai/`
- `.github/`
- `.claude/tsfpp.md`

In this package source repository, generated `.github/` compatibility output is not tracked.
GitHub workflow source is maintained under `ai/workflows/` and exported to consuming projects during init.
The Claude source file also lives under `ai/` and is deployed into `.claude/tsfpp.md` in consuming projects.

In this package repository, edit the `ai/` source tree and re-run the installer.
In consuming projects, edit the generated `.ai/` source tree instead of generated compatibility output.

## Install in a project

```sh
pnpm add -D @tsfpp/agents
node node_modules/@tsfpp/agents/init.mjs
```

The installer compiles the universal AI sources into `.ai/`, writes `ai.md`, and generates the editor compatibility layer under `.github/`.

### Non-interactive mode

```sh
node node_modules/@tsfpp/agents/init.mjs --yes
```

Use this in a `postinstall` script when you want the AI layout to stay in sync automatically:

```json
{
  "scripts": {
    "postinstall": "node node_modules/@tsfpp/agents/init.mjs --yes"
  }
}
```

## Bootstrap a new project

```sh
bash tsfpp-bootstrap.sh my-project
cd my-project
```

The bootstrap script installs the TSF++ toolchain, writes the project files, and then runs the AI compiler so the new project gets `.ai/` and `.github/` immediately.

## What gets generated

```text
ai.md

.ai/
  copilot-instructions.md
  agents/
  instructions/
  prompts/
  skills/

.github/
  copilot-instructions.md
  agents/
  instructions/
    tsfpp-mcp.instructions.md
  prompts/
  skills/
  workflows/

.claude/
  tsfpp.md
```

## Notes

- `ai.md` is the always-on root guidance file.
- The `ai/` tree is the universal source of truth.
- Generated files are workspace configuration and should be committed in the consuming project.
- Copilot compatibility is just one export target; the source files themselves stay IDE-agnostic.

## Instruction files

| Instruction | applyTo | Purpose |
|---|---|---|
| `tsfpp-mcp` | `**` | When and how to use each MCP tool, tool priority rules, and available standard resources |

## MCP server

When `@tsfpp/mcp-server` is installed and connected, agents automatically prefer
MCP tool calls over skill content for rule lookups, pattern retrieval, DEVIATION
comment generation, and mechanical compliance checks.

Without MCP server connectivity, the package still works and falls back to skill-
based guidance. The MCP-connected mode is stricter and more authoritative.

The `tsfpp-mcp.instructions.md` instruction (always active) tells Copilot when
to call which tool. Skills remain active as hot-path shortcuts for the most
common patterns.

### Quick start

```sh
pnpm add -D @tsfpp/mcp-server
```

Then configure your MCP-capable client to run `@tsfpp/mcp-server` locally for
this workspace. Once connected, the MCP-first behavior in the installed
instructions is applied automatically.

See [`@tsfpp/mcp-server`](https://www.npmjs.com/package/@tsfpp/mcp-server) for
installation and configuration.

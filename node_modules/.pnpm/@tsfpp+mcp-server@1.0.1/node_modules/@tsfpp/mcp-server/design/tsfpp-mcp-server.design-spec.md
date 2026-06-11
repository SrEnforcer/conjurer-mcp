# `@tsfpp/mcp-server` — Implementation specification

This document is the implementation specification for the `@tsfpp/mcp-server` package.
It is written for a coding agent (Copilot / tsfpp-guarded-coding). Read it completely
before writing a single line of code.

All code must conform to `CODING_STANDARD.md`. The project already has `package.json`,
`tsconfig.json`, and `eslint.config.js` configured. Do not modify those unless
explicitly instructed.

---

## §1 — Package overview

`@tsfpp/mcp-server` is a Model Context Protocol server that exposes the TSF++
standard and package API surfaces as structured, queryable tools and resources.

**Peer dependencies (already in `package.json`):**
- `@modelcontextprotocol/sdk` — MCP server SDK (not yet in package.json!)
- `@tsfpp/standard` — normative standard documents
- `@tsfpp/prelude` — prelude API surface
- `@tsfpp/boundary` — boundary API surface

**Entry point:** `src/index.ts` — exports `startServer` and all public types.
**CLI entry point:** `bin/tsfpp-mcp.ts` — calls `startServer` and handles stdio transport.

---

## §2 — Repository structure

```
src/
  index.ts                    ← public barrel: re-exports startServer + types
  server.ts                   ← MCP Server setup, tool + resource registration
  tools/
    get-rule.ts
    get-layer.ts
    search-rules.ts
    get-pattern.ts
    get-deviation.ts
    get-api-surface.ts
    check-pattern.ts
    list-forbidden.ts
  resources/
    standard-resources.ts     ← registers standard docs as MCP resources
  lib/
    rule-index.ts             ← parses and indexes all standard documents
    package-reader.ts         ← reads installed package README/RECIPES
    standard-paths.ts         ← resolves @tsfpp/standard/spec/* paths
  types.ts                    ← shared domain types (Rule, Layer, Pattern, etc.)
bin/
  tsfpp-mcp.ts                ← CLI entry point (stdio transport)
```

---

## §3 — Shared domain types (`src/types.ts`)

```ts
import { type Brand } from '@tsfpp/prelude'

export type RuleId   = Brand<string, 'RuleId'>   // e.g. '1.4', 'react.4.3'
export type Layer    = 'core' | 'api' | 'dal' | 'react' | 'cli' | 'test' | 'log' | 'config' | 'annotation' | 'security'
export type Standard = 'base' | 'api' | 'react' | 'data' | 'test' | 'annotation' | 'log' | 'config' | 'security'

export type Rule = {
  readonly id:          RuleId
  readonly level:       'MUST' | 'SHOULD' | 'MAY'
  readonly standard:    Standard
  readonly layer:       ReadonlyArray<Layer> | 'all'
  readonly title:       string
  readonly description: string
  readonly rationale?:  string
}

export type ForbiddenConstruct = {
  readonly construct:  string
  readonly rule:       RuleId
  readonly alternative: string
}

export type Pattern = {
  readonly name:        string
  readonly description: string
  readonly code:        string
  readonly antiPattern: string
}
```

---

## §4 — Rule index (`src/lib/rule-index.ts`)

Parses all standard documents from `node_modules/@tsfpp/standard/spec/` at startup.
Returns a searchable index of rules, forbidden constructs, and patterns.

**Contract:**

```ts
export type RuleIndex = {
  readonly rules:              ReadonlyArray<Rule>
  readonly forbiddenConstructs: ReadonlyArray<ForbiddenConstruct>
  readonly patterns:           ReadonlyMap<string, Pattern>
}

/**
 * Builds the rule index by reading and parsing all standard documents.
 * Called once at server startup. Returns Err if any standard file is missing.
 *
 * @returns Ok(RuleIndex) or Err with the missing file path.
 */
export const buildRuleIndex = (): Result<RuleIndex, string>
```

**Implementation notes:**
- Use `node:fs/promises` `readFile` to load each spec document
- Parse rule IDs from headings matching `### Rule N.M` or `### Rule react.N.M`
- Extract level (`MUST`/`SHOULD`/`MAY`) from the first line of the rule body
- Extract forbidden constructs from `## Never` sections (lines starting with `- \``)
- Parse patterns from code blocks labelled `// Good` and `// Bad`
- Wrap all `readFile` calls in `tryCatchAsync`
- Return `err('missing: path/to/file')` if any standard document cannot be read

---

## §5 — Package reader (`src/lib/package-reader.ts`)

Reads installed package API surfaces at runtime, reflecting the actual installed version.

**Contract:**

```ts
export type PackageSurface = {
  readonly name:    string
  readonly version: string
  readonly readme:  string
  readonly recipes: Option<string>
}

/**
 * Reads the README and RECIPES of an installed @tsfpp package.
 *
 * @param packageName - e.g. '@tsfpp/prelude', '@tsfpp/boundary'
 * @returns Ok(PackageSurface) or Err if the package is not installed.
 */
export const readPackageSurface = (
  packageName: '@tsfpp/prelude' | '@tsfpp/boundary' | '@tsfpp/standard',
): Promise<Result<PackageSurface, string>>
```

**Implementation notes:**
- Resolve path via `require.resolve(`${packageName}/package.json`)` or `import.meta.resolve`
- Read `README.md` and `RECIPES.md` from the package root
- Parse version from `package.json`
- `RECIPES.md` may not exist — return `none` if absent

---

## §6 — Standard paths (`src/lib/standard-paths.ts`)

```ts
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Resolves the absolute path to a spec document in @tsfpp/standard.
 *
 * @param filename - e.g. 'CODING_STANDARD.md', 'API_CODING_STANDARD.md'
 */
export const resolveSpecPath = (filename: string): string => {
  const pkgPath = require.resolve('@tsfpp/standard/package.json')
  return join(pkgPath, '..', 'spec', filename)
}

export const SPEC_FILES = [
  'CODING_STANDARD.md',
  'API_CODING_STANDARD.md',
  'REACT_CODING_STANDARD.md',
  'DATA_CODING_STANDARD.md',
  'TEST_CODING_STANDARD.md',
  'ANNOTATION_CODING_STANDARD.md',
  'LOG_CODING_STANDARD.md',
  'CONFIG_CODING_STANDARD.md',
  'SECURITY_CODING_STANDARD.md',
  'RATIONALE.md',
] as const
```

---

## §7 — Tools

Each tool is a pure function that takes a typed input and returns a typed output.
The MCP server wires them to tool handlers in `server.ts`. No tool reads global state —
each receives the `RuleIndex` and/or `PackageSurface` as arguments.

### 7.1 `get-rule`

```ts
// src/tools/get-rule.ts

export type GetRuleInput  = { readonly id: string }
export type GetRuleOutput = { readonly rule: Rule } | { readonly error: string }

/**
 * Returns the full text of a specific rule by its ID.
 *
 * @example get_rule({ id: '1.12' })
 * @example get_rule({ id: 'react.4.3' })
 */
export const getRule = (
  index: RuleIndex,
  input: GetRuleInput,
): GetRuleOutput
```

### 7.2 `get-layer`

```ts
// src/tools/get-layer.ts

export type GetLayerInput  = { readonly layer: Layer }
export type GetLayerOutput = { readonly rules: ReadonlyArray<Rule>; readonly summary: string }

/**
 * Returns all MUST rules that apply to a specific layer.
 * Includes both base rules and layer-specific rules.
 *
 * @example get_layer({ layer: 'api' })
 * @example get_layer({ layer: 'react' })
 */
export const getLayer = (
  index: RuleIndex,
  input: GetLayerInput,
): GetLayerOutput
```

### 7.3 `search-rules`

```ts
// src/tools/search-rules.ts

export type SearchRulesInput = {
  readonly query:  string
  readonly layer?: Layer
  readonly level?: 'MUST' | 'SHOULD'
}
export type SearchRulesOutput = { readonly results: ReadonlyArray<Rule> }

/**
 * Searches rules by keyword match on title and description.
 * Optionally filtered by layer and/or level.
 *
 * @example search_rules({ query: 'nullable' })
 * @example search_rules({ query: 'exhaustive switch', layer: 'core' })
 */
export const searchRules = (
  index: RuleIndex,
  input: SearchRulesInput,
): SearchRulesOutput
```

Implementation: simple case-insensitive substring match on `rule.title + rule.description`.
No external search library needed.

### 7.4 `get-pattern`

```ts
// src/tools/get-pattern.ts

export type GetPatternInput  = { readonly concept: string }
export type GetPatternOutput =
  | { readonly found: true;  readonly pattern: Pattern }
  | { readonly found: false; readonly suggestions: ReadonlyArray<string> }

/**
 * Returns the canonical TSF++ pattern for a concept.
 *
 * @example get_pattern({ concept: 'smart constructor' })
 * @example get_pattern({ concept: 'exhaustive match' })
 * @example get_pattern({ concept: 'Option from nullable' })
 */
export const getPattern = (
  index: RuleIndex,
  input: GetPatternInput,
): GetPatternOutput
```

### 7.5 `get-deviation`

```ts
// src/tools/get-deviation.ts

export type GetDeviationInput = {
  readonly ruleId: string
  readonly reason: string
}
export type GetDeviationOutput = {
  readonly comment:      string  // the DEVIATION(N.M) comment line
  readonly eslintLine?:  string  // paired eslint-disable-next-line if applicable
}

/**
 * Generates a correctly formatted DEVIATION comment for a rule violation.
 *
 * @example get_deviation({ ruleId: '1.4', reason: 'Framework plugin API requires interface' })
 * // → { comment: '// DEVIATION(1.4): Framework plugin API requires interface' }
 *
 * @example get_deviation({ ruleId: '1.5', reason: 'Legacy adapter — narrowed immediately below' })
 * // → {
 * //     comment: '// DEVIATION(1.5): Legacy adapter — narrowed immediately below',
 * //     eslintLine: '// eslint-disable-next-line @typescript-eslint/no-explicit-any'
 * //   }
 */
export const getDeviation = (
  index: RuleIndex,
  input: GetDeviationInput,
): GetDeviationOutput
```

**Implementation notes:**
- Format: `// DEVIATION(N.M): <reason>` — exact format, no variation
- Determine `eslintLine` by looking up the rule in the index and checking if it maps to a known ESLint rule (`1.5` → `no-explicit-any`, `1.6` → `consistent-type-assertions`, `1.4` → `@typescript-eslint/consistent-type-definitions`)
- If `ruleId` not found in index, still produce the comment — do not error

### 7.6 `get-api-surface`

```ts
// src/tools/get-api-surface.ts

export type GetApiSurfaceInput = {
  readonly package: '@tsfpp/prelude' | '@tsfpp/boundary'
  readonly section?: string  // optional section filter, e.g. 'Option', 'pagination'
}
export type GetApiSurfaceOutput =
  | { readonly found: true;  readonly version: string; readonly content: string }
  | { readonly found: false; readonly error: string }

/**
 * Returns the installed API surface for a @tsfpp package.
 * Reads from the actually installed package — always version-accurate.
 *
 * @example get_api_surface({ package: '@tsfpp/prelude' })
 * @example get_api_surface({ package: '@tsfpp/boundary', section: 'pagination' })
 */
export const getApiSurface = (
  surfaces: ReadonlyMap<string, PackageSurface>,
  input: GetApiSurfaceInput,
): GetApiSurfaceOutput
```

### 7.7 `check-pattern`

```ts
// src/tools/check-pattern.ts

export type CheckPatternInput  = { readonly code: string }
export type CheckPatternOutput = {
  readonly violations: ReadonlyArray<{
    readonly rule:       RuleId
    readonly construct:  string
    readonly line?:      number
    readonly alternative: string
  }>
  readonly clean: boolean
}

/**
 * Checks a TypeScript code snippet for mechanical TSF++ violations.
 * Deterministic — uses pattern matching, not LLM inference.
 *
 * Checks: forbidden constructs from the Never list (class, let, var, any,
 * new Map, new Set, interface without DEVIATION, enum, throw in core,
 * console.*, process.env outside loader, if(x===null), etc.)
 *
 * @example check_pattern({ code: 'const x = new Map()' })
 * // → { violations: [{ rule: '2.4', construct: 'new Map()', alternative: 'intoMap([...]) from @tsfpp/prelude' }] }
 */
export const checkPattern = (
  index: RuleIndex,
  input: CheckPatternInput,
): CheckPatternOutput
```

**Implementation notes:**
- Use `RegExp` patterns against the code string — no AST parsing needed for mechanical checks
- Patterns to detect (non-exhaustive, build from `index.forbiddenConstructs`):
  - `/\blet\b/` → rule 2.1
  - `/\bvar\b/` → rule 2.1
  - `/\bclass\b/` → rule 1.9
  - `/\benum\b/` → rule 1.8
  - `/\bnew Map\(/` → rule 2.4
  - `/\bnew Set\(/` → rule 2.4
  - `/\bany\b/` → rule 1.5
  - `/\bconsole\.(log|error|warn|info)\b/` → LOG rule
  - `/\bprocess\.env\b/` → CONFIG rule
  - `/=== (null|undefined)/` and `/!== (null|undefined)/` → rule 6.3
  - `/\bthrow\b/` outside `catch` → rule 6.2
  - `/\binterface\b/` without DEVIATION comment on previous line → rule 1.4

### 7.8 `list-forbidden`

```ts
// src/tools/list-forbidden.ts

export type ListForbiddenOutput = {
  readonly constructs: ReadonlyArray<ForbiddenConstruct>
}

/**
 * Returns the complete list of forbidden constructs with their
 * rule references and TSF++ alternatives.
 */
export const listForbidden = (index: RuleIndex): ListForbiddenOutput
```

---

## §8 — Resources (`src/resources/standard-resources.ts`)

Register each standard document as an MCP resource. The model can read a full
document when it needs the complete context, rather than only what tools return.

```ts
// Resource URI scheme: tsfpp://standard/<filename>
// e.g. tsfpp://standard/CODING_STANDARD.md

export const RESOURCES = SPEC_FILES.map(filename => ({
  uri:      `tsfpp://standard/${filename}`,
  name:     filename.replace('_CODING_STANDARD.md', '').replace('_', '/').toLowerCase(),
  mimeType: 'text/markdown',
}))
```

Resource content is read lazily on request — not loaded at startup.

---

## §9 — Server (`src/server.ts`)

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { type RuleIndex } from './lib/rule-index'
import { type PackageSurface } from './lib/package-reader'
// ... tool imports

export type ServerDeps = {
  readonly ruleIndex:    RuleIndex
  readonly apiSurfaces:  ReadonlyMap<string, PackageSurface>
}

/**
 * Creates and configures the MCP server with all tools and resources.
 * Does not start transport — call server.connect(transport) after this.
 */
export const createServer = (deps: ServerDeps): McpServer
```

**Tool registration pattern** (repeat for each tool):

```ts
server.tool(
  'get_rule',
  'Returns the full text and rationale of a specific TSF++ rule by its ID (e.g. "1.12", "react.4.3")',
  { id: z.string().describe('Rule ID, e.g. "1.4" or "react.4.3"') },
  async ({ id }) => {
    const result = getRule(deps.ruleIndex, { id })
    return {
      content: [{
        type: 'text',
        text: 'error' in result ? result.error : formatRule(result.rule),
      }],
    }
  },
)
```

**Resource registration:**

```ts
server.resource(
  `tsfpp://standard/${filename}`,
  `tsfpp://standard/${filename}`,
  async (uri) => {
    const content = await readFile(resolveSpecPath(filename), 'utf8')
    return {
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: content }],
    }
  },
)
```

---

## §10 — CLI entry point (`bin/tsfpp-mcp.ts`)

```ts
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { buildRuleIndex } from '../src/lib/rule-index'
import { readPackageSurface } from '../src/lib/package-reader'
import { createServer } from '../src/server'
import { isErr, fromNullable, pipe } from '@tsfpp/prelude'

const main = async (): Promise<void> => {
  const indexResult = buildRuleIndex()
  if (isErr(indexResult)) {
    process.stderr.write(`tsfpp-mcp: failed to build rule index: ${indexResult.error}\n`)
    process.exit(1)
  }

  const [prelude, boundary] = await Promise.allSettled([
    readPackageSurface('@tsfpp/prelude'),
    readPackageSurface('@tsfpp/boundary'),
  ])

  const surfaces = new Map<string, PackageSurface>()
  if (prelude.status === 'fulfilled' && !isErr(prelude.value)) surfaces.set('@tsfpp/prelude', prelude.value.value)
  if (boundary.status === 'fulfilled' && !isErr(boundary.value)) surfaces.set('@tsfpp/boundary', boundary.value.value)

  const server = createServer({
    ruleIndex:   indexResult.value,
    apiSurfaces: surfaces,
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// DEVIATION(6.2): process.exit at the application entry point only
main().catch(err => {
  process.stderr.write(`tsfpp-mcp: fatal: ${String(err)}\n`)
  process.exit(1)
})
```

---

## §11 — `src/index.ts` (public barrel)

```ts
export { createServer, type ServerDeps } from './server'
export { buildRuleIndex, type RuleIndex } from './lib/rule-index'
export { readPackageSurface, type PackageSurface } from './lib/package-reader'
export type { Rule, Layer, Standard, RuleId, ForbiddenConstruct, Pattern } from './types'
```

---

## §12 — TSF++ compliance notes

This codebase follows TSF++. Specific considerations for this package:

**`node:fs/promises` and `node:path`** — file I/O wraps every `readFile` in `tryCatchAsync`. Never use raw `try/catch`.

**`process.env` and `process.exit`** — only in `bin/tsfpp-mcp.ts`. No other file touches `process`.

**`console.*`** — forbidden. The CLI binary may write to `process.stderr` directly for fatal startup errors only.

**`RegExp` in `check-pattern`** — patterns are `as const` arrays defined at module level, not constructed inside functions. `RegExp` literals are pure values; no mutation.

**`Map` for `apiSurfaces`** — constructed once at startup from `intoMap` from `@tsfpp/prelude`. Never `new Map()` except in `readPackageSurface` where the native `Map` is constructed from `intoMap` entries.

**`McpServer`** — this is a class from an external library. Instantiation via `new McpServer(...)` is unavoidable; add `// DEVIATION(1.9): MCP SDK requires class instantiation`.

---

## §13 — Test strategy

- `src/lib/rule-index.ts` — unit tests with fixture markdown files (no real `@tsfpp/standard` required)
- `src/tools/*.ts` — unit tests with a mock `RuleIndex`; one test per tool covering the success path and the not-found path
- `src/lib/package-reader.ts` — integration test against the installed `@tsfpp/prelude`
- `bin/tsfpp-mcp.ts` — not unit tested; covered by manual smoke test

Test factories in `tests/factories/`:
- `makeRule(overrides?)` — produces a valid `Rule`
- `makeRuleIndex(rules?)` — produces a `RuleIndex` with the given rules
- `makePackageSurface(overrides?)` — produces a `PackageSurface`

---

## §14 — Implementation order

Build in this order. Each step must typecheck and lint before proceeding.

1. `src/types.ts`
2. `src/lib/standard-paths.ts`
3. `src/lib/rule-index.ts` + unit tests
4. `src/lib/package-reader.ts` + integration test
5. `src/tools/list-forbidden.ts` (simplest — no input)
6. `src/tools/get-rule.ts` + unit tests
7. `src/tools/get-layer.ts` + unit tests
8. `src/tools/search-rules.ts` + unit tests
9. `src/tools/get-deviation.ts` + unit tests
10. `src/tools/get-pattern.ts` + unit tests
11. `src/tools/get-api-surface.ts` + unit tests
12. `src/tools/check-pattern.ts` + unit tests
13. `src/resources/standard-resources.ts`
14. `src/server.ts`
15. `src/index.ts`
16. `bin/tsfpp-mcp.ts`
17. Manual smoke test: `node bin/tsfpp-mcp.js` — connect via MCP Inspector
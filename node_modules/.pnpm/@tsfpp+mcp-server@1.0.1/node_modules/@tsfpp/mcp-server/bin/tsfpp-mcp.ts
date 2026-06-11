#!/usr/bin/env node
/**
 * @module tsfpp-mcp
 *
 * Bootstrap the TSF++ MCP server over stdio for local tool integrations.
 *
 * Startup loads standards and package surfaces once, then hands control to the
 * MCP transport loop to serve requests until process termination.
 *
 * @packageDocumentation
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { intoMap, isErr } from '@tsfpp/prelude'

import { buildRuleIndex, createServer, readPackageSurface } from '../src/index'

declare const process: {
  readonly stderr: { write: (message: string) => void }
  readonly exit: (code: number) => never
}

/**
 * Start the MCP server using stdio transport.
 *
 * Package-surface loading is best-effort so server startup remains available
 * even when optional package docs cannot be read in the local environment.
 *
 * @returns Promise that resolves after transport connection is established.
 */
const main = async (): Promise<void> => {
  const ruleIndexResult = buildRuleIndex()

  if (isErr(ruleIndexResult)) {
    process.stderr.write(`tsfpp-mcp: failed to build rule index: ${ruleIndexResult.error}\n`)
    process.exit(1)
    return
  }

  const ruleIndex = ruleIndexResult.value

  const [preludeResult, boundaryResult] = await Promise.allSettled([
    readPackageSurface('@tsfpp/prelude'),
    readPackageSurface('@tsfpp/boundary'),
  ])

  const apiSurfaceEntries = [
    ...(preludeResult.status === 'fulfilled' && !isErr(preludeResult.value) ? [['@tsfpp/prelude', preludeResult.value.value] as const] : []),
    ...(boundaryResult.status === 'fulfilled' && !isErr(boundaryResult.value) ? [['@tsfpp/boundary', boundaryResult.value.value] as const] : []),
  ] as const

  const apiSurfaces = intoMap(apiSurfaceEntries)

  const server = createServer({
    ruleIndex,
    apiSurfaces,
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error: unknown) => {
  process.stderr.write(`tsfpp-mcp: fatal: ${String(error)}\n`)
  process.exit(1)
})

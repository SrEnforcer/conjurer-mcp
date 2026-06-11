/**
 * @module server
 *
 * Assemble the MCP server by connecting the immutable rule index, installed
 * package surfaces, tool handlers, and resource readers.
 *
 * Transport stays outside this module so the same server can run over stdio or
 * other MCP transports without changing the tool/resource wiring.
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { type PackageSurface } from './lib/package-reader'
import { SPEC_FILES, resolveSpecPath, type SpecFileName } from './lib/standard-paths'
import { type RuleIndex } from './lib/rule-index'
import { RESOURCES } from './resources/standard-resources'
import { checkPattern } from './tools/check-pattern'
import { getApiSurface } from './tools/get-api-surface'
import { type GetApiSurfaceInput } from './tools/get-api-surface'
import { getDeviation } from './tools/get-deviation'
import { getLayer } from './tools/get-layer'
import { getPattern } from './tools/get-pattern'
import { getRule } from './tools/get-rule'
import { listForbidden } from './tools/list-forbidden'
import { searchRules } from './tools/search-rules'
import { type SearchRulesInput } from './tools/search-rules'

/**
 * Describe immutable dependencies required to assemble the MCP server.
 */
export type ServerDeps = {
  readonly ruleIndex: RuleIndex
  readonly apiSurfaces: ReadonlyMap<string, PackageSurface>
}

const toolContent = (text: string): ReadonlyArray<{ readonly type: 'text'; readonly text: string }> => [{ type: 'text', text }]

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2)

const formatRule = (result: ReturnType<typeof getRule>): string =>
  'error' in result ? result.error : formatJson(result.rule)

const formatLayer = (result: ReturnType<typeof getLayer>): string => formatJson(result)

const formatSearch = (result: ReturnType<typeof searchRules>): string => formatJson(result.results)

const formatPattern = (result: ReturnType<typeof getPattern>): string =>
  result.found ? formatJson(result.pattern) : formatJson(result.suggestions)

const formatDeviation = (result: ReturnType<typeof getDeviation>): string => formatJson(result)

const formatApiSurface = (result: ReturnType<typeof getApiSurface>): string =>
  result.found ? result.content : result.error

const formatCheckPattern = (result: ReturnType<typeof checkPattern>): string => formatJson(result)

const searchRulesInputFrom = (query: string, layer: SearchRulesInput['layer'], level: SearchRulesInput['level']): SearchRulesInput => ({
  query,
  ...(typeof layer === 'undefined' ? {} : { layer }),
  ...(typeof level === 'undefined' ? {} : { level }),
})

const apiSurfaceInputFrom = (packageName: GetApiSurfaceInput['package'], section: string | undefined): GetApiSurfaceInput =>
  typeof section === 'undefined' ? { package: packageName } : { package: packageName, section }

const resourceFilenameFrom = (uri: string): SpecFileName => {
  const rawFilename = uri.slice('tsfpp://standard/'.length)

  return SPEC_FILES.find((filename) => filename === rawFilename) ?? 'CODING_STANDARD.md'
}

const registerTools = (server: McpServer, deps: ServerDeps): void => {
  server.tool('get_rule', 'Return one rule by id.', { id: z.string() }, ({ id }) =>
    ({ content: [...toolContent(formatRule(getRule(deps.ruleIndex, { id })))] }))

  server.tool('get_layer', 'Return MUST rules for one layer.', { layer: z.enum(['core', 'api', 'dal', 'react', 'cli', 'test', 'log', 'config', 'annotation', 'security']) }, ({ layer }) =>
    ({ content: [...toolContent(formatLayer(getLayer(deps.ruleIndex, { layer })))] }))

  server.tool('search_rules', 'Search rules by keyword.', {
    query: z.string(),
    layer: z.enum(['core', 'api', 'dal', 'react', 'cli', 'test', 'log', 'config', 'annotation', 'security']).optional(),
    level: z.enum(['MUST', 'SHOULD']).optional(),
  }, ({ query, layer, level }) => ({ content: [...toolContent(formatSearch(searchRules(deps.ruleIndex, searchRulesInputFrom(query, layer, level))))] }))

  server.tool('get_pattern', 'Return a canonical TSF++ pattern by concept.', { concept: z.string() }, ({ concept }) =>
    ({ content: [...toolContent(formatPattern(getPattern(deps.ruleIndex, { concept })))] }))

  server.tool('get_deviation', 'Generate a DEVIATION comment for a rule violation.', { ruleId: z.string(), reason: z.string() }, ({ ruleId, reason }) =>
    ({ content: [...toolContent(formatDeviation(getDeviation(deps.ruleIndex, { ruleId, reason })))] }))

  server.tool('get_api_surface', 'Return installed API surface for a TSF++ package.', {
    package: z.enum(['@tsfpp/prelude', '@tsfpp/boundary']),
    section: z.string().optional(),
  }, ({ package: packageName, section }) => ({ content: [...toolContent(formatApiSurface(getApiSurface(deps.apiSurfaces, apiSurfaceInputFrom(packageName, section))))] }))

  server.tool('check_pattern', 'Check code for mechanical TSF++ violations.', { code: z.string() }, ({ code }) =>
    ({ content: [...toolContent(formatCheckPattern(checkPattern(deps.ruleIndex, { code })))] }))

  server.tool('list_forbidden', 'List all forbidden constructs.', (_extra) =>
    ({ content: [...toolContent(formatJson(listForbidden(deps.ruleIndex).constructs))] }))
}

const registerResources = (server: McpServer): void => {
  RESOURCES.forEach((resource) => {
    server.resource(resource.name, resource.uri, async (uri) => {
      const filename = resourceFilenameFrom(uri.href)
      const content = readFileSync(resolveSpecPath(filename), 'utf8')

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      }
    })
  })
}

/**
 * Create an MCP server wired with TSF++ tools and standard resources.
 *
 * Transport setup is intentionally left to the caller so the same registration
 * graph can run over stdio or alternate MCP transports.
 *
 * @param deps - Shared immutable data dependencies used by tool handlers.
 * @returns Configured MCP server instance ready to connect to a transport.
 */
export const createServer = (deps: ServerDeps): McpServer => {
  // DEVIATION(1.9): The MCP SDK constructor is the boundary where the server object must be instantiated.
  // eslint-disable-next-line no-restricted-syntax
  const server = new McpServer({ name: '@tsfpp/mcp-server', version: '0.1.0' })

  registerTools(server, deps)
  registerResources(server)

  return server
}

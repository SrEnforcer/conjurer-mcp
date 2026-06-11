/**
 * @module index
 *
 * Re-export the stable public surface for the TSF++ MCP server package.
 *
 * Keeping this barrel narrow prevents consumers from binding to internal
 * parser or transport details that may evolve independently.
 *
 * @packageDocumentation
 */

export { createServer, type ServerDeps } from './server'
export { buildRuleIndex, type RuleIndex } from './lib/rule-index'
export { readPackageSurface, type PackageSurface } from './lib/package-reader'
export type { Rule, Layer, Standard, RuleId, ForbiddenConstruct, Pattern } from './types'

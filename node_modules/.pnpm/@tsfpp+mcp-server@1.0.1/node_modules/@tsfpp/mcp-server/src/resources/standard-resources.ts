/**
 * @module standard-resources
 *
 * Declare the fixed MCP resource catalog for TSF++ standard documents so the
 * model can request full normative context by URI.
 *
 * These resources are static and derived from the same spec file list used by
 * rule indexing, keeping resource and parser coverage aligned.
 *
 * @packageDocumentation
 */

import { SPEC_FILES } from '../lib/standard-paths'

/**
 * Describe one MCP resource entry for a TSF++ standard document.
 */
export type StandardResource = {
  readonly uri: string
  readonly name: string
  readonly mimeType: 'text/markdown'
}

const resourceNameFrom = (filename: string): string =>
  filename.replace('_CODING_STANDARD.md', '').replace('_', '/').toLowerCase()

/**
 * Declare the static TSF++ standard resource catalog exposed by the server.
 *
 * This array is derived from SPEC_FILES so resource coverage stays aligned
 * with the parser's canonical standard-file inventory.
 */
export const RESOURCES: ReadonlyArray<StandardResource> = SPEC_FILES.map((filename) => ({
  uri: `tsfpp://standard/${filename}`,
  name: resourceNameFrom(filename),
  mimeType: 'text/markdown',
}))

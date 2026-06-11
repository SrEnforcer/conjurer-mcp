/**
 * @module standard-paths
 *
 * Resolve file-system locations for @tsfpp/standard markdown specs so runtime
 * indexing can load the exact installed package version.
 *
 * Resolution is centralized in this module to keep path assumptions in one
 * place and reduce breakage when package layout changes.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * List standard files that define the TSF++ normative surface.
 *
 * This canonical list drives rule indexing and MCP resource registration, so
 * additions should happen here first to keep startup behavior predictable.
 */
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

/**
 * Represent one allowed @tsfpp/standard spec filename.
 */
export type SpecFileName = (typeof SPEC_FILES)[number]

/**
 * Resolve an absolute path for a TSF++ spec document filename.
 *
 * The path is computed from the installed package root rather than a relative
 * repo path so the server always reads the version actually installed.
 *
 * @param filename - Spec filename from SPEC_FILES.
 * @returns Absolute path to the spec markdown file.
 */
export const resolveSpecPath = (filename: SpecFileName): string => {
  const packageJsonPath = require.resolve('@tsfpp/standard/package.json')

  return join(packageJsonPath, '..', 'spec', filename)
}

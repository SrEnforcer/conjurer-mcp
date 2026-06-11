/**
 * @module get-api-surface
 *
 * Return installed TSF++ package surface docs for tool-assisted API guidance.
 *
 * This module keeps package-read markdown responses deterministic by applying
 * lightweight text filtering instead of parser-dependent section extraction.
 *
 * @packageDocumentation
 */

import { fromNullable, isNone } from '@tsfpp/prelude'

import { type PackageSurface } from '../lib/package-reader'

/**
 * Describe package API surface query input.
 */
export type GetApiSurfaceInput = {
  readonly package: '@tsfpp/prelude' | '@tsfpp/boundary'
  readonly section?: string
}

/**
 * Represent package surface lookup success or failure.
 */
export type GetApiSurfaceOutput =
  | { readonly found: true; readonly version: string; readonly content: string }
  | { readonly found: false; readonly error: string }

const mergeSurfaceText = (surface: PackageSurface): string =>
  isNone(surface.recipes) ? surface.readme : `${surface.readme}\n\n${surface.recipes.value}`

const filterBySection = (text: string, section: string): string => {
  const lines = text.split('\n')
  const sectionStart = lines.findIndex((line) => line.toLowerCase().includes(section.toLowerCase()))

  if (sectionStart < 0) {
    return ''
  }

  return lines.slice(sectionStart).join('\n').trim()
}

/**
 * Return installed package API surface content, optionally filtered by section.
 *
 * Section filtering is substring-based to remain predictable even when package
 * markdown formatting changes between versions.
 *
 * @param surfaces - Loaded package surfaces keyed by package name.
 * @param input - Package selection and optional section filter.
 * @returns Found content payload or explanatory error.
 */
export const getApiSurface = (
  surfaces: ReadonlyMap<string, PackageSurface>,
  input: GetApiSurfaceInput,
): GetApiSurfaceOutput => {
  const maybeSurface = fromNullable(surfaces.get(input.package))

  if (isNone(maybeSurface)) {
    return { found: false, error: `package not loaded: ${input.package}` }
  }

  const fullText = mergeSurfaceText(maybeSurface.value)
  const content = typeof input.section === 'undefined' ? fullText : filterBySection(fullText, input.section)

  return content.length > 0
    ? { found: true, version: maybeSurface.value.version, content }
    : { found: false, error: `section not found: ${input.section ?? ''}` }
}

/**
 * @module get-pattern
 *
 * Resolve canonical TSF++ patterns by concept key from the parsed index.
 *
 * When an exact match is missing, bounded suggestions are returned so callers
 * can recover without a second exploratory listing call.
 *
 * @packageDocumentation
 */

import { isSome, lookup, pipe } from '@tsfpp/prelude'

import { type RuleIndex } from '../lib/rule-index'
import { type Pattern } from '../types'

/**
 * Describe a concept lookup request for pattern retrieval.
 */
export type GetPatternInput = { readonly concept: string }

/**
 * Represent a pattern lookup result or fallback suggestions.
 */
export type GetPatternOutput =
  | { readonly found: true; readonly pattern: Pattern }
  | { readonly found: false; readonly suggestions: ReadonlyArray<string> }

const normalize = (value: string): string => value.toLowerCase().trim()

const buildSuggestions = (index: RuleIndex, concept: string): ReadonlyArray<string> => {
  const normalizedConcept = normalize(concept)

  const suggestions = Array.from(index.patterns.keys())
    .filter((key) => key.includes(normalizedConcept) || normalizedConcept.includes(key))
    .slice(0, 5)

  return suggestions
}

/**
 * Return a canonical TSF++ pattern for a requested concept.
 *
 * Suggestions are included when no exact match is found so callers can recover
 * without issuing additional exploratory list calls.
 *
 * @param index - Immutable rule index shared by server handlers.
 * @param input - Concept lookup payload.
 * @returns Exact pattern match or suggestion candidates.
 */
export const getPattern = (index: RuleIndex, input: GetPatternInput): GetPatternOutput => {
  const normalizedConcept = normalize(input.concept)
  const maybePattern = pipe(index.patterns, lookup(normalizedConcept))

  return isSome(maybePattern)
    ? { found: true, pattern: maybePattern.value }
    : { found: false, suggestions: buildSuggestions(index, input.concept) }
}

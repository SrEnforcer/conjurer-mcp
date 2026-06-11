/**
 * @module search-rules
 *
 * Provide keyword-based rule discovery with optional layer and level filters.
 *
 * The search remains substring-based rather than semantic so query behavior is
 * transparent and repeatable across environments.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'
import { type Layer, type Rule } from '../types'

/**
 * Describe the rule-search query and optional narrowing filters.
 */
export type SearchRulesInput = {
  readonly query: string
  readonly layer?: Layer
  readonly level?: 'MUST' | 'SHOULD'
}

/**
 * Represent the rule-search result set.
 */
export type SearchRulesOutput = { readonly results: ReadonlyArray<Rule> }

const includesLayer = (rule: Rule, layer: Layer): boolean =>
  rule.layer === 'all' || rule.layer.includes(layer)

const searchableText = (rule: Rule): string =>
  `${rule.title} ${rule.description}`.toLowerCase()

/**
 * Search rules by keyword with optional layer and level filters.
 *
 * Matching is intentionally substring-based and case-insensitive to keep the
 * query behavior deterministic and transparent for tool users.
 *
 * @param index - Immutable rule index shared by server handlers.
 * @param input - Search query and optional filters.
 * @returns List of matching rules.
 */
export const searchRules = (index: RuleIndex, input: SearchRulesInput): SearchRulesOutput => {
  const normalizedQuery = input.query.toLowerCase().trim()

  const results = index.rules.filter((rule) => {
    const queryMatches = searchableText(rule).includes(normalizedQuery)
    const levelMatches = typeof input.level === 'undefined' || rule.level === input.level
    const layerMatches = typeof input.layer === 'undefined' || includesLayer(rule, input.layer)

    return queryMatches && levelMatches && layerMatches
  })

  return { results }
}

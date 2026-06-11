/**
 * @module get-layer
 *
 * Project layer-specific MUST rules from the shared rule index.
 *
 * Including global `all` rules in each layer response preserves the baseline
 * contract that every layer inherits from the core standard.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'
import { type Layer, type Rule } from '../types'

/**
 * Describe the layer selection input for layer rule queries.
 */
export type GetLayerInput = { readonly layer: Layer }

/**
 * Represent filtered MUST rules and the query summary.
 */
export type GetLayerOutput = { readonly rules: ReadonlyArray<Rule>; readonly summary: string }

const appliesToLayer = (rule: Rule, layer: Layer): boolean =>
  rule.layer === 'all' || rule.layer.includes(layer)

/**
 * Return all MUST rules that apply to one target layer.
 *
 * Layer responses include global base rules (`all`) so consumers can compose a
 * complete checklist for the requested slice without extra requests.
 *
 * @param index - Immutable rule index shared by server handlers.
 * @param input - Layer selection payload.
 * @returns Filtered MUST rules and a short summary string.
 */
export const getLayer = (index: RuleIndex, input: GetLayerInput): GetLayerOutput => {
  const rules = index.rules.filter((rule) => rule.level === 'MUST' && appliesToLayer(rule, input.layer))

  return {
    rules,
    summary: `Found ${String(rules.length)} MUST rules for layer ${input.layer}.`,
  }
}

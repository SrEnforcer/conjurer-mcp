/**
 * @module get-rule
 *
 * Resolve one normalized rule record by identifier from the in-memory index.
 *
 * Returning an explicit error payload instead of a nullable shape keeps MCP
 * callers deterministic and avoids implicit fallback behavior.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'
import { type Rule } from '../types'

/**
 * Describe the lookup payload for rule-id queries.
 */
export type GetRuleInput = { readonly id: string }

/**
 * Represent the rule lookup outcome.
 *
 * The union keeps not-found behavior explicit so callers do not treat missing
 * rules as empty successful responses.
 */
export type GetRuleOutput = { readonly rule: Rule } | { readonly error: string }

/**
 * Return one rule by its identifier.
 *
 * Keeping this lookup narrow avoids implicit fallback semantics; callers can
 * surface explicit not-found feedback instead of guessing alternatives.
 *
 * @param index - Immutable rule index shared by server handlers.
 * @param input - Rule lookup payload containing the target id.
 * @returns Matching rule payload or an explicit error message.
 */
export const getRule = (index: RuleIndex, input: GetRuleInput): GetRuleOutput => {
  const maybeRule = index.rules.find((rule) => rule.id === input.id)

  return typeof maybeRule === 'undefined'
    ? { error: `rule not found: ${input.id}` }
    : { rule: maybeRule }
}

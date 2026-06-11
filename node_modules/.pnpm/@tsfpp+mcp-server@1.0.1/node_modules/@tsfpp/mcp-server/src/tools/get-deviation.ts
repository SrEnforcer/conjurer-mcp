/**
 * @module get-deviation
 *
 * Compose DEVIATION comments and optional eslint disable lines for TSF++ rule
 * exceptions that cannot be avoided at adapter boundaries.
 *
 * Keeping this mapping centralized prevents drift between generated deviation
 * text and the lint directives required by the coding standard.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'

/**
 * Describe the input required to generate a DEVIATION comment.
 */
export type GetDeviationInput = {
  readonly ruleId: string
  readonly reason: string
}

/**
 * Represent generated DEVIATION output and optional eslint companion line.
 */
export type GetDeviationOutput = {
  readonly comment: string
  readonly eslintLine?: string
}

const eslintLineForRule = (ruleId: string): string | undefined => {
  switch (ruleId) {
    case '1.4':
      return '// eslint-disable-next-line @typescript-eslint/consistent-type-definitions'
    case '1.5':
      return '// eslint-disable-next-line @typescript-eslint/no-explicit-any'
    case '1.6':
      return '// eslint-disable-next-line @typescript-eslint/consistent-type-assertions'
    default:
      return undefined
  }
}

/**
 * Generate TSF++ DEVIATION comments with optional eslint pairing.
 *
 * The mapping is deterministic and intentionally permissive: unknown rule ids
 * still produce a valid DEVIATION comment so callers can document edge cases.
 *
 * @param _index - Rule index (unused now, reserved for rule-aware extensions).
 * @param input - Rule id and explanation payload.
 * @returns Deviation comment and optional eslint disable companion line.
 */
export const getDeviation = (_index: RuleIndex, input: GetDeviationInput): GetDeviationOutput => {
  const comment = `// DEVIATION(${input.ruleId}): ${input.reason}`
  const eslintLine = eslintLineForRule(input.ruleId)

  return typeof eslintLine === 'undefined' ? { comment } : { comment, eslintLine }
}

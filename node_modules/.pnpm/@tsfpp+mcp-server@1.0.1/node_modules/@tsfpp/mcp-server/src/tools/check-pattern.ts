/**
 * @module check-pattern
 *
 * Perform deterministic text-level checks for forbidden TSF++ constructs.
 *
 * The implementation deliberately avoids AST dependencies to keep interactive
 * guidance fast and reproducible in constrained MCP environments.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'
import { type RuleId } from '../types'

/**
 * Describe the code snippet to inspect for forbidden constructs.
 */
export type CheckPatternInput = { readonly code: string }

/**
 * Represent detected construct violations and clean-state metadata.
 */
export type CheckPatternOutput = {
  readonly violations: ReadonlyArray<{
    readonly rule: RuleId
    readonly construct: string
    readonly line?: number
    readonly alternative: string
  }>
  readonly clean: boolean
}

const isWordChar = (char: string): boolean => /[A-Za-z0-9_]/u.test(char)

const hasConstruct = (line: string, construct: string): boolean => {
  const index = line.indexOf(construct)

  if (index < 0) {
    return false
  }

  const beforeChar = index === 0 ? ' ' : line.charAt(index - 1)
  const afterIndex = index + construct.length
  const afterChar = afterIndex >= line.length ? ' ' : line.charAt(afterIndex)

  return !isWordChar(beforeChar) && !isWordChar(afterChar)
}

const findLine = (code: string, construct: string): number | undefined => {
  const lines = code.split('\n')
  const lineIndex = lines.findIndex((line) => hasConstruct(line, construct))

  return lineIndex < 0 ? undefined : lineIndex + 1
}

const buildViolation = (params: {
  readonly rule: RuleId
  readonly construct: string
  readonly alternative: string
  readonly line: number | undefined
}): {
  readonly rule: RuleId
  readonly construct: string
  readonly line?: number
  readonly alternative: string
} =>
  typeof params.line === 'undefined'
    ? {
        rule: params.rule,
        construct: params.construct,
        alternative: params.alternative,
      }
    : {
        rule: params.rule,
        construct: params.construct,
        line: params.line,
        alternative: params.alternative,
      }

/**
 * Check code text for deterministic forbidden construct matches.
 *
 * The detector is regex-only by design so results are reproducible and suitable
 * for fast interactive guidance without AST tooling overhead.
 *
 * @param index - Immutable rule index with forbidden constructs.
 * @param input - Code snippet payload.
 * @returns Violation list and clean flag.
 */
export const checkPattern = (index: RuleIndex, input: CheckPatternInput): CheckPatternOutput => {
  const violations = index.forbiddenConstructs.flatMap((forbidden) => {
    if (!input.code.split('\n').some((line) => hasConstruct(line, forbidden.construct))) {
      return []
    }

    return [
      buildViolation({
        rule: forbidden.rule,
        construct: forbidden.construct,
        line: findLine(input.code, forbidden.construct),
        alternative: forbidden.alternative,
      }),
    ]
  })

  return {
    violations,
    clean: violations.length === 0,
  }
}

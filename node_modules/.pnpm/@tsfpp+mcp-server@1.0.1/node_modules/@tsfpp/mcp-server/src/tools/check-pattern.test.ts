import { describe, expect, it } from 'vitest'

import { makeForbidden, makeRuleIndex } from '../../tests/factories/make-rule-index'
import { checkPattern } from './check-pattern'

describe('checkPattern', () => {
  it('detects mechanical TSF++ violations with alternatives', () => {
    const index = makeRuleIndex({
      forbiddenConstructs: [
        makeForbidden({ construct: 'let', alternative: 'Use const.' }),
      ],
    })

    const code = [
      'const a = 1',
      'let b = 2',
    ].join('\n')

    const result = checkPattern(index, { code })

    expect(result.clean).toBe(false)
    expect(result.violations.length).toBe(1)
    expect(result.violations[0]?.construct).toBe('let')
  })

  it('returns clean when no forbidden construct appears', () => {
    const index = makeRuleIndex({ forbiddenConstructs: [] })

    const result = checkPattern(index, { code: 'const value = 1' })

    expect(result).toEqual({ violations: [], clean: true })
  })
})

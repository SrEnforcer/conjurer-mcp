import { describe, expect, it } from 'vitest'

import { makeRuleIndex } from '../../tests/factories/make-rule-index'
import { getRule } from './get-rule'

describe('getRule', () => {
  it('returns the matching rule for a valid id', () => {
    const index = makeRuleIndex()

    const result = getRule(index, { id: '1.4' })

    expect('rule' in result).toBe(true)
  })

  it('returns error when the rule id is not found', () => {
    const index = makeRuleIndex()

    const result = getRule(index, { id: '9.9' })

    expect(result).toEqual({ error: 'rule not found: 9.9' })
  })
})

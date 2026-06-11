import { describe, expect, it } from 'vitest'

import { makeRuleIndex } from '../../tests/factories/make-rule-index'
import { getDeviation } from './get-deviation'

describe('getDeviation', () => {
  it('formats DEVIATION comments for any rule id', () => {
    const index = makeRuleIndex()

    const result = getDeviation(index, { ruleId: '1.4', reason: 'Framework integration boundary.' })

    expect(result.comment).toBe('// DEVIATION(1.4): Framework integration boundary.')
  })

  it('adds eslint helper line for no-explicit-any mapping', () => {
    const index = makeRuleIndex()

    const result = getDeviation(index, { ruleId: '1.5', reason: 'Legacy adapter narrowed immediately below.' })

    expect(result.eslintLine).toBe('// eslint-disable-next-line @typescript-eslint/no-explicit-any')
  })
})

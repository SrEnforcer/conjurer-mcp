import { describe, expect, it } from 'vitest'

import { makeRuleIndex } from '../../tests/factories/make-rule-index'
import { getPattern } from './get-pattern'

describe('getPattern', () => {
  it('returns canonical pattern when the concept exists', () => {
    const index = makeRuleIndex()

    const result = getPattern(index, { concept: 'smart constructor' })

    expect(result).toMatchObject({ found: true })
  })

  it('returns suggestions when pattern does not exist', () => {
    const index = makeRuleIndex()

    const result = getPattern(index, { concept: 'monad transformer' })

    expect(result).toMatchObject({ found: false })
    expect('suggestions' in result).toBe(true)
  })
})

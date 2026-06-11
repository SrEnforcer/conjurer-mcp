import { describe, expect, it } from 'vitest'

import { makeRule, makeRuleIndex } from '../../tests/factories/make-rule-index'
import { searchRules } from './search-rules'

describe('searchRules', () => {
  it('finds rules by keyword in title and description', () => {
    const index = makeRuleIndex({
      rules: [
        makeRule({ title: 'Use Option', description: 'Handle nullable values with Option.' }),
        makeRule({ title: 'Exhaustive switch', description: 'Use absurd in default branch.' }),
      ],
    })

    const result = searchRules(index, { query: 'nullable' })

    expect(result.results.length).toBe(1)
  })

  it('applies optional layer and level filters', () => {
    const index = makeRuleIndex({
      rules: [
        makeRule({ level: 'MUST', layer: ['api'], standard: 'api' }),
        makeRule({ level: 'SHOULD', layer: ['api'], standard: 'api' }),
      ],
    })

    const result = searchRules(index, { query: 'use', layer: 'api', level: 'MUST' })

    expect(result.results.length).toBe(1)
    expect(result.results[0]?.level).toBe('MUST')
  })
})

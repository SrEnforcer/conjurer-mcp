import { describe, expect, it } from 'vitest'

import { makeRule, makeRuleIndex } from '../../tests/factories/make-rule-index'
import { getLayer } from './get-layer'

describe('getLayer', () => {
  it('returns MUST rules for the target layer and all-layer rules', () => {
    const index = makeRuleIndex({
      rules: [
        makeRule({ id: makeRule().id, level: 'MUST', layer: 'all' }),
        makeRule({ id: makeRule().id, level: 'MUST', layer: ['api'], standard: 'api' }),
        makeRule({ id: makeRule().id, level: 'SHOULD', layer: ['api'], standard: 'api' }),
      ],
    })

    const result = getLayer(index, { layer: 'api' })

    expect(result.rules.length).toBe(2)
    expect(result.summary.includes('api')).toBe(true)
  })
})

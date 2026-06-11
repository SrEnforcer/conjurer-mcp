import { describe, expect, it } from 'vitest'

import { makeForbidden, makeRuleIndex } from '../../tests/factories/make-rule-index'
import { listForbidden } from './list-forbidden'

describe('listForbidden', () => {
  it('returns all forbidden constructs from the index', () => {
    const index = makeRuleIndex({
      forbiddenConstructs: [
        makeForbidden({ construct: 'let' }),
        makeForbidden({ construct: 'var' }),
      ],
    })

    const result = listForbidden(index)

    expect(result.constructs.length).toBe(2)
  })
})

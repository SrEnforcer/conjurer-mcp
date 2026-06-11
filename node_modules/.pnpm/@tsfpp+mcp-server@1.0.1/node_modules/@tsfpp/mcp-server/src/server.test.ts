import { describe, expect, it } from 'vitest'
import { intoMap } from '@tsfpp/prelude'

import { createServer } from './server'
import { makePackageSurface } from '../tests/factories/make-package-surface'
import { makeRuleIndex } from '../tests/factories/make-rule-index'

describe('createServer', () => {
  it('creates a server when rule index and package surfaces are available', async () => {
    const ruleIndex = makeRuleIndex()

    const server = createServer({
      ruleIndex,
      apiSurfaces: intoMap([
        ['@tsfpp/prelude', makePackageSurface()],
        ['@tsfpp/boundary', makePackageSurface({ name: '@tsfpp/boundary' })],
      ]),
    })

    expect(server).toBeDefined()
  })
})

import { describe, expectTypeOf, it } from 'vitest'

import type {
  ForbiddenConstruct,
  Layer,
  Pattern,
  Rule,
  RuleId,
  Standard,
} from './types'

describe('types', () => {
  it('defines the supported layers and standards', () => {
    expectTypeOf<Layer>().toMatchTypeOf<
      | 'core'
      | 'api'
      | 'dal'
      | 'react'
      | 'cli'
      | 'test'
      | 'log'
      | 'config'
      | 'annotation'
      | 'security'
    >()

    expectTypeOf<Standard>().toMatchTypeOf<
      | 'base'
      | 'api'
      | 'react'
      | 'data'
      | 'test'
      | 'annotation'
      | 'log'
      | 'config'
      | 'security'
    >()
  })

  it('keeps rule and pattern contracts readonly', () => {
    expectTypeOf<Rule>().toMatchTypeOf<{
      readonly id: RuleId
      readonly level: 'MUST' | 'SHOULD' | 'MAY'
      readonly standard: Standard
      readonly layer: ReadonlyArray<Layer> | 'all'
      readonly title: string
      readonly description: string
      readonly rationale?: string
    }>()

    expectTypeOf<ForbiddenConstruct>().toMatchTypeOf<{
      readonly construct: string
      readonly rule: RuleId
      readonly alternative: string
    }>()

    expectTypeOf<Pattern>().toMatchTypeOf<{
      readonly name: string
      readonly description: string
      readonly code: string
      readonly antiPattern: string
    }>()
  })
})

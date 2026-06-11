import { describe, expect, it } from 'vitest'

import { RESOURCES } from './standard-resources'

describe('RESOURCES', () => {
  it('exposes one resource per TSF++ standard spec file', () => {
    expect(RESOURCES.length).toBeGreaterThan(0)
    expect(RESOURCES[0]?.uri).toBe('tsfpp://standard/CODING_STANDARD.md')
  })

  it('names the base spec resource using the expected slug', () => {
    expect(RESOURCES[0]?.name).toBe('coding/standard.md')
  })
})

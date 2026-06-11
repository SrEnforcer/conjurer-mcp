import { describe, expect, it } from 'vitest'

import * as api from './index'

describe('public barrel', () => {
  it('re-exports the server and library entry points', () => {
    expect(typeof api.createServer).toBe('function')
    expect(typeof api.buildRuleIndex).toBe('function')
    expect(typeof api.readPackageSurface).toBe('function')
  })
})

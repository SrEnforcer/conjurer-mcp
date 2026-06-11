import { describe, expect, it } from 'vitest'

import { intoMap } from '@tsfpp/prelude'

import { makeMissingRecipesSurface, makePackageSurface } from '../../tests/factories/make-package-surface'
import { getApiSurface } from './get-api-surface'

describe('getApiSurface', () => {
  it('returns full package surface when no section filter is provided', () => {
    const surfaces = intoMap([
      ['@tsfpp/prelude', makePackageSurface()],
    ])

    const result = getApiSurface(surfaces, { package: '@tsfpp/prelude' })

    expect(result).toMatchObject({ found: true, version: '1.2.3' })
  })

  it('returns error when package is missing', () => {
    const surfaces = intoMap<string, ReturnType<typeof makePackageSurface>>([])

    const result = getApiSurface(surfaces, { package: '@tsfpp/prelude' })

    expect(result).toEqual({ found: false, error: 'package not loaded: @tsfpp/prelude' })
  })

  it('filters output by section when provided', () => {
    const surfaces = intoMap([
      ['@tsfpp/boundary', makeMissingRecipesSurface()],
    ])

    const result = getApiSurface(surfaces, { package: '@tsfpp/boundary', section: 'pagination' })

    expect(result).toMatchObject({ found: false })
  })
})

import { isSome, map, ok, pipe } from '@tsfpp/prelude'
import { describe, expect, it } from 'vitest'

import { readPackageSurface } from './package-reader'

describe('readPackageSurface', () => {
  it('reads the installed @tsfpp/prelude package surface', async () => {
    const result = await readPackageSurface('@tsfpp/prelude')

    expect(pipe(result, map((surface) => surface.name))).toEqual(ok('@tsfpp/prelude'))
    expect(pipe(result, map((surface) => surface.version.length > 0))).toEqual(ok(true))
    expect(pipe(result, map((surface) => surface.readme.includes('@tsfpp/prelude')))).toEqual(ok(true))
    expect(pipe(result, map((surface) => isSome(surface.recipes)))).toEqual(ok(true))
  })

  it('reads the installed @tsfpp/standard package surface', async () => {
    const result = await readPackageSurface('@tsfpp/standard')

    expect(pipe(result, map((surface) => surface.name))).toEqual(ok('@tsfpp/standard'))
    expect(pipe(result, map((surface) => surface.version.length > 0))).toEqual(ok(true))
    expect(pipe(result, map((surface) => surface.readme.length > 0))).toEqual(ok(true))
  })
})

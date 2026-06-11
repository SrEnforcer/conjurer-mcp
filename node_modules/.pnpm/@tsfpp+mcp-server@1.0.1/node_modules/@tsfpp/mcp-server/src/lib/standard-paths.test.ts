import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { SPEC_FILES, resolveSpecPath } from './standard-paths'

describe('standard paths', () => {
  it('exposes the expected TSF++ spec files', () => {
    const expected = [
      'CODING_STANDARD.md',
      'API_CODING_STANDARD.md',
      'REACT_CODING_STANDARD.md',
      'DATA_CODING_STANDARD.md',
      'TEST_CODING_STANDARD.md',
      'ANNOTATION_CODING_STANDARD.md',
      'LOG_CODING_STANDARD.md',
      'CONFIG_CODING_STANDARD.md',
      'SECURITY_CODING_STANDARD.md',
      'RATIONALE.md',
    ] as const

    expect(SPEC_FILES).toEqual(expected)
  })

  it('resolves CODING_STANDARD.md to a readable file', async () => {
    const filePath = resolveSpecPath('CODING_STANDARD.md')

    await expect(access(filePath, constants.R_OK)).resolves.toBeUndefined()
  })
})

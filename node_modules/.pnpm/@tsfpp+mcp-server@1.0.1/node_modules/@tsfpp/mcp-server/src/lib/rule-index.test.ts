import { readFile } from 'node:fs/promises'

import { err, isSome, lookup, map, ok, pipe } from '@tsfpp/prelude'
import { describe, expect, it } from 'vitest'

import { buildRuleIndex, buildRuleIndexFromSources } from './rule-index'
import { SPEC_FILES } from './standard-paths'

describe('buildRuleIndexFromSources', () => {
  it('parses rules, forbidden constructs, and patterns from markdown fixtures', async () => {
    const fixturePath = 'tests/fixtures/rule-index/base-sample.md'
    const content = await readFile(fixturePath, 'utf8')
    const sources = SPEC_FILES.map((filename) => ({
      filename,
      content: filename === 'CODING_STANDARD.md' ? content : '',
    }))

    const result = buildRuleIndexFromSources(sources)

    expect(pipe(result, map((index) => index.rules.length))).toEqual(ok(2))
    expect(pipe(result, map((index) => index.forbiddenConstructs.length))).toEqual(ok(2))
    expect(
      pipe(
        result,
        map((index) =>
          pipe(index.patterns, lookup('smart constructor')),
        ),
        map((pattern) => isSome(pattern)),
      ),
    ).toEqual(ok(true))
  })

  it('returns Err when required spec files are missing', () => {
    const sources = [] as const

    const result = buildRuleIndexFromSources(sources)

    expect(result).toEqual(err('missing: CODING_STANDARD.md'))
  })
})

describe('buildRuleIndex', () => {
  it('builds an index from installed @tsfpp/standard files', () => {
    const result = buildRuleIndex()

    expect(pipe(result, map((index) => index.rules.length > 0))).toEqual(ok(true))
  })
})

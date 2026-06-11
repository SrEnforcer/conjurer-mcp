/**
 * @module rule-index
 *
 * Build an immutable query index from TSF++ standard markdown files so MCP
 * tools can answer rule and pattern requests deterministically.
 *
 * Parsing is intentionally mechanical (regex + line scanning) to keep behavior
 * reproducible and independent from model interpretation.
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs'

import {
  type Option,
  type Result,
  err,
  fromNullable,
  getOrElse,
  isErr,
  isNone,
  isSome,
  lookup,
  none,
  ok,
  pipe,
  some,
  traverseArray,
  tryCatch,
  intoMap,
} from '@tsfpp/prelude'

import { type ForbiddenConstruct, type Layer, type Pattern, type Rule, type RuleId, type Standard } from '../types'
import { SPEC_FILES, type SpecFileName, resolveSpecPath } from './standard-paths'

/**
 * Group parsed rules, forbidden constructs, and patterns for MCP lookups.
 *
 * The index is immutable so it can be shared across requests without defensive
 * cloning or mutation guards in transport handlers.
 */
export type RuleIndex = {
  readonly rules: ReadonlyArray<Rule>
  readonly forbiddenConstructs: ReadonlyArray<ForbiddenConstruct>
  readonly patterns: ReadonlyMap<string, Pattern>
}

type SourceFile = {
  readonly filename: SpecFileName
  readonly content: string
}

const ruleHeadingRegex = /### Rule ([a-z]+\.\d+\.\d+|\d+\.\d+)(?:\s*[—-]\s*(.*))?\n([\s\S]*?)(?=\n### Rule |\n## |\n# |$)/g

const neverSectionRegex = /## Never([\s\S]*?)(?=\n## |\n### |\n# |$)/g

const patternHeadingRegex = /### Pattern:\s*(.+)\n([\s\S]*?)(?=\n### Pattern:|\n## |\n# |$)/g

const codeBlockRegex = /```[a-z]*\n([\s\S]*?)```/g

const forbiddenMetadata = intoMap<string, { readonly rule: string; readonly alternative: string }>([
  ['let', { rule: '2.1', alternative: 'Use const.' }],
  ['var', { rule: '2.1', alternative: 'Use const.' }],
  ['class', { rule: '1.9', alternative: 'Use readonly records and pure functions.' }],
  ['enum', { rule: '1.8', alternative: 'Use a string-literal union.' }],
  ['any', { rule: '1.5', alternative: 'Use unknown and narrow it immediately.' }],
])

const standardByFile: Readonly<Record<SpecFileName, Standard>> = {
  'CODING_STANDARD.md': 'base',
  'API_CODING_STANDARD.md': 'api',
  'REACT_CODING_STANDARD.md': 'react',
  'DATA_CODING_STANDARD.md': 'data',
  'TEST_CODING_STANDARD.md': 'test',
  'ANNOTATION_CODING_STANDARD.md': 'annotation',
  'LOG_CODING_STANDARD.md': 'log',
  'CONFIG_CODING_STANDARD.md': 'config',
  'SECURITY_CODING_STANDARD.md': 'security',
  'RATIONALE.md': 'base',
}

const layerByFile: Readonly<Record<SpecFileName, ReadonlyArray<Layer> | 'all'>> = {
  'CODING_STANDARD.md': 'all',
  'API_CODING_STANDARD.md': ['api'],
  'REACT_CODING_STANDARD.md': ['react'],
  'DATA_CODING_STANDARD.md': ['dal'],
  'TEST_CODING_STANDARD.md': ['test'],
  'ANNOTATION_CODING_STANDARD.md': ['annotation'],
  'LOG_CODING_STANDARD.md': ['log'],
  'CONFIG_CODING_STANDARD.md': ['config'],
  'SECURITY_CODING_STANDARD.md': ['security'],
  'RATIONALE.md': 'all',
}

const levelFromBody = (body: string): 'MUST' | 'SHOULD' | 'MAY' =>
  body.includes('MUST')
    ? 'MUST'
    : body.includes('MAY')
      ? 'MAY'
      : 'SHOULD'

const standardFromFile = (filename: SpecFileName): Standard => standardByFile[filename]

const layerFromFile = (filename: SpecFileName): ReadonlyArray<Layer> | 'all' => layerByFile[filename]

const mkRuleId = (raw: string): Option<RuleId> =>
  /^[a-z]+\.\d+\.\d+$|^\d+\.\d+$/.test(raw)
    ? (
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor cast after regex validation
        some(raw as RuleId)
      )
    : none

const nonEmptyLines = (text: string): ReadonlyArray<string> =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

const titleFrom = (headingTitle: string, firstLine: string): string => {
  const bodyTitle = firstLine.replace(/^(MUST|SHOULD|MAY)\s*:\s*/u, '').trim()

  return headingTitle.length > 0 ? headingTitle : bodyTitle
}

const descriptionFrom = (lines: ReadonlyArray<string>, firstLine: string): string => {
  const tail = lines.slice(1).join(' ').trim()

  return tail.length > 0 ? tail : firstLine
}

const rationaleFrom = (lines: ReadonlyArray<string>): Option<string> =>
  pipe(
    fromNullable(lines.find((line) => line.startsWith('Rationale:'))),
    (lineOption) => (isSome(lineOption) ? some(lineOption.value.replace('Rationale:', '').trim()) : none),
  )

const buildRule = (params: {
  readonly id: RuleId
  readonly filename: SpecFileName
  readonly body: string
  readonly headingTitle: string
  readonly lines: ReadonlyArray<string>
}): Rule => {
  const firstLine = pipe(fromNullable(params.lines[0]), getOrElse(() => 'Unnamed rule'))
  const title = titleFrom(params.headingTitle, firstLine)
  const description = descriptionFrom(params.lines, firstLine)
  const rationaleOption = rationaleFrom(params.lines)

  const baseRule = {
    id: params.id,
    level: levelFromBody(params.body),
    standard: standardFromFile(params.filename),
    layer: layerFromFile(params.filename),
    title,
    description,
  }

  return isSome(rationaleOption)
    ? {
        ...baseRule,
        rationale: rationaleOption.value,
      }
    : baseRule
}

const parseRuleMatch = (filename: SpecFileName, match: RegExpMatchArray): Option<Rule> => {
  const idRaw = pipe(fromNullable(match[1]), getOrElse(() => '')).trim()
  const headingTitle = pipe(fromNullable(match[2]), getOrElse(() => '')).trim()
  const body = pipe(fromNullable(match[3]), getOrElse(() => '')).trim()

  if (idRaw.length === 0 || body.length === 0) {
    return none
  }

  const lines = nonEmptyLines(body)

  return pipe(
    mkRuleId(idRaw),
    (ruleIdOption) => (isSome(ruleIdOption) ? some(buildRule({ id: ruleIdOption.value, filename, body, headingTitle, lines })) : none),
  )
}

const parseRulesFromSource = (source: SourceFile): ReadonlyArray<Rule> => {
  const matches = Array.from(source.content.matchAll(ruleHeadingRegex))
  const maybeRules = matches.map((match) => parseRuleMatch(source.filename, match))

  return maybeRules.flatMap((ruleOption) => (isSome(ruleOption) ? [ruleOption.value] : []))
}

const parseForbiddenLine = (line: string): Option<ForbiddenConstruct> => {
  const constructMatch = line.match(/^- `([^`]+)`(?:\s*-\s*(.+))?$/u)
  const constructOption = pipe(
    fromNullable(constructMatch),
    (matchOption) => (isSome(matchOption) ? fromNullable(matchOption.value[1]) : none),
  )

  if (isNone(constructOption)) {
    return none
  }

  const metadataOption = pipe(forbiddenMetadata, lookup(constructOption.value))

  if (isNone(metadataOption)) {
    return none
  }

  const ruleIdOption = mkRuleId(metadataOption.value.rule)

  if (isNone(ruleIdOption)) {
    return none
  }

  const explicitAlternative = pipe(
    fromNullable(constructMatch),
    (matchOption) => (isSome(matchOption) ? fromNullable(matchOption.value[2]) : none),
  )

  const alternative = pipe(explicitAlternative, getOrElse(() => metadataOption.value.alternative))

  return some({
    construct: constructOption.value,
    rule: ruleIdOption.value,
    alternative,
  })
}

const parseForbiddenFromSource = (source: SourceFile): ReadonlyArray<ForbiddenConstruct> => {
  const sections = Array.from(source.content.matchAll(neverSectionRegex)).map((match) => match[1])
  const lines = sections
    .map((section) => pipe(fromNullable(section), getOrElse(() => '')))
    .flatMap((section) => section.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- `'))

  const maybeConstructs = lines.map(parseForbiddenLine)

  return maybeConstructs.flatMap((constructOption) => (isSome(constructOption) ? [constructOption.value] : []))
}

const parsePatternMatch = (sectionMatch: RegExpMatchArray): Option<Pattern> => {
  const name = pipe(fromNullable(sectionMatch[1]), getOrElse(() => '')).trim()
  const body = pipe(fromNullable(sectionMatch[2]), getOrElse(() => '')).trim()

  if (name.length === 0 || body.length === 0) {
    return none
  }

  const codeBlocks = Array.from(body.matchAll(codeBlockRegex)).map((blockMatch) =>
    pipe(fromNullable(blockMatch[1]), getOrElse(() => '')).trim(),
  )

  const goodCodeOption = fromNullable(codeBlocks.find((code) => code.includes('// Good')))
  const badCodeOption = fromNullable(codeBlocks.find((code) => code.includes('// Bad')))

  if (isNone(goodCodeOption) || isNone(badCodeOption)) {
    return none
  }

  const description = body.replace(codeBlockRegex, '').trim()

  return some({
    name,
    description,
    code: goodCodeOption.value,
    antiPattern: badCodeOption.value,
  })
}

const parsePatternsFromSource = (source: SourceFile): ReadonlyArray<Pattern> => {
  const sections = Array.from(source.content.matchAll(patternHeadingRegex))
  const maybePatterns = sections.map(parsePatternMatch)

  return maybePatterns.flatMap((patternOption) => (isSome(patternOption) ? [patternOption.value] : []))
}

/**
 * Build a rule index from in-memory markdown sources.
 *
 * This helper exists to keep parser tests deterministic and independent from
 * installed node_modules layout while sharing the same parser logic used in
 * startup.
 *
 * @param sources - Markdown sources keyed by TSF++ standard filenames.
 * @returns Ok(index) when all required files are present, otherwise Err(missing path).
 */
export const buildRuleIndexFromSources = (sources: ReadonlyArray<SourceFile>): Result<RuleIndex, string> => {
  const sourceMap = intoMap(sources.map((source) => [source.filename, source.content] as const))

  const missing = pipe(
    fromNullable(SPEC_FILES.find((filename) => isNone(pipe(sourceMap, lookup(filename))))),
  )

  if (isSome(missing)) {
    return err(`missing: ${missing.value}`)
  }

  const requiredSources = SPEC_FILES.map((filename) => ({
    filename,
    content: pipe(
      sourceMap,
      lookup(filename),
      getOrElse(() => ''),
    ),
  }))

  const rules = requiredSources.flatMap(parseRulesFromSource)
  const forbiddenConstructs = requiredSources.flatMap(parseForbiddenFromSource)
  const patterns = intoMap(
    requiredSources
      .flatMap(parsePatternsFromSource)
      .map((pattern) => [pattern.name.toLowerCase(), pattern] as const),
  )

  return ok({
    rules,
    forbiddenConstructs,
    patterns,
  })
}

/**
 * Build the rule index from installed @tsfpp/standard markdown files.
 *
 * Startup uses this function once, then shares the immutable index across
 * tool handlers to avoid repeated I/O and repeated parsing work.
 *
 * @returns Ok(index) or Err with the first missing file path.
 */
export const buildRuleIndex = (): Result<RuleIndex, string> => {
  const sourceResult = traverseArray((filename: SpecFileName) => {
    const filePath = resolveSpecPath(filename)

    return tryCatch(
      () => ({
        filename,
        content: readFileSync(filePath, 'utf8'),
      }),
      () => `missing: ${filePath}`,
    )
  })(SPEC_FILES)

  if (isErr(sourceResult)) {
    return err(sourceResult.error)
  }

  return buildRuleIndexFromSources(sourceResult.value)
}
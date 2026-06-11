/**
 * @module make-rule-index
 *
 * Provide reusable immutable fixture builders for rule-index dependent tests.
 *
 * Centralizing these factories keeps test intent focused on behavior while
 * allowing fixture defaults to evolve with domain-model changes.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../../src/lib/rule-index'
import { type ForbiddenConstruct, type Pattern, type Rule, type RuleId } from '../../src/types'
import { intoMap } from '@tsfpp/prelude'

const mkRuleIdUnsafe = (raw: string): RuleId =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): test fixture helper for branded type
  raw as RuleId

/**
 * Build a default rule fixture with optional field overrides.
 *
 * @param overrides - Partial fields to override fixture defaults.
 * @returns Deterministic Rule fixture for tests.
 */
export const makeRule = (overrides?: Partial<Rule>): Rule => ({
  id: mkRuleIdUnsafe('1.4'),
  level: 'MUST',
  standard: 'base',
  layer: 'all',
  title: 'Prefer type aliases over interfaces',
  description: 'Use type aliases for domain records.',
  ...overrides,
})

/**
 * Build a default forbidden-construct fixture with optional overrides.
 *
 * @param overrides - Partial fields to override fixture defaults.
 * @returns Deterministic ForbiddenConstruct fixture for tests.
 */
export const makeForbidden = (overrides?: Partial<ForbiddenConstruct>): ForbiddenConstruct => ({
  construct: 'let',
  rule: mkRuleIdUnsafe('2.1'),
  alternative: 'Use const.',
  ...overrides,
})

/**
 * Build a default pattern fixture with optional overrides.
 *
 * @param overrides - Partial fields to override fixture defaults.
 * @returns Deterministic Pattern fixture for tests.
 */
export const makePattern = (overrides?: Partial<Pattern>): Pattern => ({
  name: 'smart constructor',
  description: 'Use validated smart constructors for branded values.',
  code: '// Good\nconst id = mkUserId(raw)',
  antiPattern: '// Bad\nconst id = raw as UserId',
  ...overrides,
})

/**
 * Build a default RuleIndex fixture with optional overrides.
 *
 * @param overrides - Partial fields to override fixture defaults.
 * @returns RuleIndex fixture ready for tool and server tests.
 */
export const makeRuleIndex = (overrides?: Partial<RuleIndex>): RuleIndex => ({
  rules: [makeRule(), makeRule({ id: mkRuleIdUnsafe('react.4.3'), level: 'SHOULD', standard: 'react', layer: ['react'], title: 'Keep effects for synchronization only' })],
  forbiddenConstructs: [makeForbidden()],
  patterns: intoMap<string, Pattern>([[
    'smart constructor',
    makePattern(),
  ]]),
  ...overrides,
})

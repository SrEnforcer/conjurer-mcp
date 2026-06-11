/**
 * @module types
 *
 * Define the shared domain model for TSF++ MCP rule queries so all tools,
 * resources, and server wiring agree on one immutable vocabulary.
 *
 * The unions are intentionally closed because MCP handlers rely on exhaustive
 * matching and deterministic serialization across tool boundaries.
 *
 * @packageDocumentation
 */

import { type Brand } from '@tsfpp/prelude'

/**
 * Identify a normalized TSF++ rule reference.
 *
 * Branding prevents accidental mixing with arbitrary strings and ensures tools
 * that accept a rule identifier receive a value produced by trusted parsing.
 *
 * @example
 * // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): test-only fixture cast for branded id
 * const id = '1.4' as RuleId
 */
export type RuleId = Brand<string, 'RuleId'>

/**
 * Enumerate layers that TSF++ rules can target directly.
 *
 * These values align with the standards package slices so layer filtering in
 * tool handlers stays stable across versions.
 */
export type Layer =
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

/**
 * Enumerate standard documents that define normative constraints.
 *
 * The union mirrors the current @tsfpp/standard document split so indexed
 * rules retain provenance for filtering and reporting.
 */
export type Standard =
  | 'base'
  | 'api'
  | 'react'
  | 'data'
  | 'test'
  | 'annotation'
  | 'log'
  | 'config'
  | 'security'

/**
 * Represent one normalized rule extracted from standard markdown.
 *
 * Keeping the fields immutable makes index sharing safe across handlers and
 * avoids accidental mutation between MCP requests.
 */
export type Rule = {
  readonly id: RuleId
  readonly level: 'MUST' | 'SHOULD' | 'MAY'
  readonly standard: Standard
  readonly layer: ReadonlyArray<Layer> | 'all'
  readonly title: string
  readonly description: string
  readonly rationale?: string
}

/**
 * Describe a banned construct with its normative replacement.
 *
 * This structure feeds deterministic lint-like checks and guidance tools,
 * so each record couples the construct to the exact rule reference.
 */
export type ForbiddenConstruct = {
  readonly construct: string
  readonly rule: RuleId
  readonly alternative: string
}

/**
 * Describe a canonical TSF++ pattern and its anti-pattern counterpart.
 *
 * Storing both sides enables quick coaching responses that explain not only
 * what to do but also what to avoid in adjacent code.
 */
export type Pattern = {
  readonly name: string
  readonly description: string
  readonly code: string
  readonly antiPattern: string
}

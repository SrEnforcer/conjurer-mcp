/**
 * @module list-forbidden
 *
 * Expose the indexed forbidden-construct catalog without transformation.
 *
 * This pass-through exists so transport adapters can stay thin while the rule
 * index remains the single source of truth for construct guidance.
 *
 * @packageDocumentation
 */

import { type RuleIndex } from '../lib/rule-index'
import { type ForbiddenConstruct } from '../types'

/**
 * Represent the forbidden-construct list payload.
 */
export type ListForbiddenOutput = {
  readonly constructs: ReadonlyArray<ForbiddenConstruct>
}

/**
 * Return every forbidden construct known by the current rule index.
 *
 * @param index - Immutable rule index shared by server handlers.
 * @returns Forbidden constructs list.
 */
export const listForbidden = (index: RuleIndex): ListForbiddenOutput => ({
  constructs: index.forbiddenConstructs,
})

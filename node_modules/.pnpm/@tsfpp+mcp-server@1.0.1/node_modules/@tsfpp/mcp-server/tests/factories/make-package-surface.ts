/**
 * @module make-package-surface
 *
 * Provide reusable package-surface fixtures for API-surface and server tests.
 *
 * Using centralized fixtures keeps markdown samples and version metadata
 * consistent across tests that assert formatting and lookup behavior.
 *
 * @packageDocumentation
 */

import { none, some } from '@tsfpp/prelude'

import { type PackageSurface } from '../../src/lib/package-reader'

/**
 * Build a default package-surface fixture with optional overrides.
 *
 * @param overrides - Partial fields to override fixture defaults.
 * @returns Deterministic PackageSurface fixture for tests.
 */
export const makePackageSurface = (overrides?: Partial<PackageSurface>): PackageSurface => ({
  name: '@tsfpp/prelude',
  version: '1.2.3',
  readme: '# @tsfpp/prelude\n\n## Option\nUse Option for nullable values.',
  recipes: some('# Recipes\nUse pipe and map.'),
  ...overrides,
})

/**
 * Build a fixture variant where RECIPES content is intentionally absent.
 *
 * @returns PackageSurface fixture with recipes set to none.
 */
export const makeMissingRecipesSurface = (): PackageSurface =>
  makePackageSurface({
    name: '@tsfpp/boundary',
    recipes: none,
  })

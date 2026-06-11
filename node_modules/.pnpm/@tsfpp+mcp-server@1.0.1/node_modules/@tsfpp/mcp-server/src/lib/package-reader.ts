/**
 * @module package-reader
 *
 * Read installed TSF++ package metadata and markdown so tool responses always
 * reflect the exact local package version available to the runtime.
 *
 * This module isolates filesystem access and parsing at the boundary while the
 * rest of the server consumes typed immutable data.
 *
 * @packageDocumentation
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

import {
  type Option,
  type Result,
  err,
  getStringField,
  isErr,
  isNone,
  isRecord,
  none,
  ok,
  pipe,
  some,
  tryCatch,
  fromNullable,
  getOrElse,
  tryCatchAsync,
} from '@tsfpp/prelude'

const require = createRequire(import.meta.url)

/**
 * Represent the loaded documentation surface of one installed TSF++ package.
 *
 * README is required, while RECIPES remains optional because package releases
 * are not guaranteed to ship that companion guide.
 */
export type PackageSurface = {
  readonly name: string
  readonly version: string
  readonly readme: string
  readonly recipes: Option<string>
}

const parseVersion = (packageJsonContent: string): Result<string, string> => {
  const parsedJsonResult = tryCatch(
    () => JSON.parse(packageJsonContent),
    () => 'invalid package.json: expected valid JSON',
  )

  if (isErr(parsedJsonResult)) {
    return err(parsedJsonResult.error)
  }

  if (!isRecord(parsedJsonResult.value)) {
    return err('invalid package.json: expected object root')
  }

  const versionOption = getStringField(parsedJsonResult.value, 'version')

  return isNone(versionOption) ? err('invalid package.json: missing version field') : ok(versionOption.value)
}

const resolvePackageJsonPath = (
  packageName: '@tsfpp/prelude' | '@tsfpp/boundary' | '@tsfpp/standard',
): Result<string, string> => {
  const directPath = tryCatch(
    () => require.resolve(`${packageName}/package.json`),
    () => `package not installed: ${packageName}`,
  )

  if (!isErr(directPath)) {
    return ok(directPath.value)
  }

  const entryPath = tryCatch(
    () => require.resolve(packageName),
    () => `package not installed: ${packageName}`,
  )

  if (isErr(entryPath)) {
    return err(entryPath.error)
  }

  const entryDir = dirname(entryPath.value)
  const candidates = [
    join(entryDir, 'package.json'),
    join(entryDir, '..', 'package.json'),
    join(entryDir, '..', '..', 'package.json'),
  ] as const

  const resolvedPath = pipe(
    fromNullable(candidates.find((candidate) => existsSync(candidate))),
    getOrElse(() => ''),
  )

  return resolvedPath.length > 0 ? ok(resolvedPath) : err(`package not installed: ${packageName}`)
}

/**
 * Read README and RECIPES markdown from an installed @tsfpp package.
 *
 * RECIPES is optional because not every package ships that document, while
 * README and package metadata are required for a usable API surface response.
 *
 * @param packageName - Installed TSF++ package name.
 * @returns Ok(package surface) or Err when the package cannot be loaded.
 */
export const readPackageSurface = async (
  packageName: '@tsfpp/prelude' | '@tsfpp/boundary' | '@tsfpp/standard',
): Promise<Result<PackageSurface, string>> => {
  const packageJsonPathResult = resolvePackageJsonPath(packageName)

  if (isErr(packageJsonPathResult)) {
    return err(packageJsonPathResult.error)
  }

  const packageRoot = dirname(packageJsonPathResult.value)

  const packageJsonContentResult = await tryCatchAsync(
    () => readFile(packageJsonPathResult.value, 'utf8'),
    () => `missing: ${packageJsonPathResult.value}`,
  )

  if (isErr(packageJsonContentResult)) {
    return err(packageJsonContentResult.error)
  }

  const versionResult = parseVersion(packageJsonContentResult.value)

  if (isErr(versionResult)) {
    return err(versionResult.error)
  }

  const readmePath = join(packageRoot, 'README.md')
  const readmeResult = await tryCatchAsync(
    () => readFile(readmePath, 'utf8'),
    () => `missing: ${readmePath}`,
  )

  if (isErr(readmeResult)) {
    return err(readmeResult.error)
  }

  const recipesPath = join(packageRoot, 'RECIPES.md')
  const recipesResult = await tryCatchAsync(
    () => readFile(recipesPath, 'utf8'),
    () => `missing: ${recipesPath}`,
  )

  return ok({
    name: packageName,
    version: versionResult.value,
    readme: readmeResult.value,
    recipes: isErr(recipesResult) ? none : some(recipesResult.value),
  })
}
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ok, err, none, some, isErr, isSome, fromNullable } from '@tsfpp/prelude';
import type { Result, Option } from '@tsfpp/prelude';

export type SpecReader = {
  readonly specPath: string;
};

const _require = createRequire(import.meta.url);

/** Directory names tried beside the monorepo root, in order, for a live spec checkout. */
const SIBLING_SPEC_DIRS: ReadonlyArray<string> = ['conjurer-spec', 'conjurer'];

const hasIndexFile = (dir: string): boolean => existsSync(resolve(dir, 'index.edn'));

const fromEnvironment = (): Option<string> => {
  const fromEnv = process.env['CONJURER_SPEC_PATH'];
  return fromEnv !== undefined && fromEnv.length > 0 && hasIndexFile(fromEnv) ? some(resolve(fromEnv)) : none;
};

const fromSibling = (): Option<string> => {
  // The monorepo root is 3 levels up from src/ or dist/; its parent holds sibling checkouts.
  const selfDir = dirname(fileURLToPath(import.meta.url));
  const parent = resolve(selfDir, '..', '..', '..', '..');
  return fromNullable(SIBLING_SPEC_DIRS.map((name) => resolve(parent, name)).find(hasIndexFile));
};

const fromInstalledPackage = (): Option<string> => {
  try {
    return some(dirname(_require.resolve('conjurer-spec/package.json')));
  } catch {
    return none;
  }
};

/**
 * Locate the Conjurer specification, preferring a live checkout over an installed copy.
 *
 * Order: `CONJURER_SPEC_PATH`; a sibling checkout named `conjurer-spec` or `conjurer`
 * beside the monorepo; the installed `conjurer-spec` package. The installed package is
 * a copy made at install time, so it is the last resort: the server reads the spec live.
 *
 * @returns The spec directory, or none when no candidate holds an `index.edn`.
 */
export const resolveSpecPath = (): Option<string> => {
  const env = fromEnvironment();
  if (isSome(env)) return env;
  const sibling = fromSibling();
  return isSome(sibling) ? sibling : fromInstalledPackage();
};

export const readGrimoire = (reader: SpecReader, grimoire: string): Result<string, string> => {
  const filePath = resolve(reader.specPath, 'grimoires', `${grimoire}.md`);
  if (!existsSync(filePath)) return err(`Grimoire not found: ${grimoire}`);
  return ok(readFileSync(filePath, 'utf8'));
};

const extractSection = (content: string, section: string): string => {
  const needle = section.startsWith('#') ? section : `# ${section}`;
  const idx = content.indexOf(needle);
  if (idx === -1) return content;
  const nextHeading = content.indexOf('\n#', idx + needle.length);
  return nextHeading === -1 ? content.slice(idx) : content.slice(idx, nextHeading);
};

export const readSection = (reader: SpecReader, grimoire: string, section: string): Result<string, string> => {
  const contentRes = readGrimoire(reader, grimoire);
  if (isErr(contentRes)) return err(contentRes.error);
  return ok(extractSection(contentRes.value, section));
};

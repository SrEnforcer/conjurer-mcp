import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ok, err, none, some, isErr } from '@tsfpp/prelude';
import type { Result, Option } from '@tsfpp/prelude';

export type SpecReader = {
  readonly specPath: string;
};

const _require = createRequire(import.meta.url);

export const resolveSpecPath = (): Option<string> => {
  try {
    const pkgPath = _require.resolve('conjurer-spec/package.json');
    return some(dirname(pkgPath));
  } catch {
    // ../conjurer-spec relative to the monorepo root — 4 levels up from src/ or dist/
    const selfDir = dirname(fileURLToPath(import.meta.url));
    const sibling = resolve(selfDir, '..', '..', '..', '..', 'conjurer-spec');
    return existsSync(sibling) ? some(sibling) : none;
  }
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

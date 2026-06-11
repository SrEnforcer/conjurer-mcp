#!/usr/bin/env node
/**
 * @tsfpp/agents init
 *
 * Compiles the universal AI sources from `ai/` into `.ai/`, generates
 * compatibility files in `.github/`, and installs Claude Code configuration.
 *
 * Usage:
 *   node node_modules/@tsfpp/agents/init.mjs          (interactive)
 *   node node_modules/@tsfpp/agents/init.mjs --yes    (non-interactive / postinstall)
 *
 * --yes mode: installs the universal AI sources, generates compatibility
 * output, and deploys tsfpp.md into .claude/ (not CLAUDE.md). Skips
 * eslint.config.js and tsconfig.json — workspace-owned and never touched.
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync }    from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { buildAiLayout } from './scripts/build-ai.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd       = process.cwd();
const YES       = process.argv.includes('--yes');

const dim    = (s) => `\x1b[2m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// ─── File map ─────────────────────────────────────────────────────────────────
// [source (relative to this file), destination (relative to cwd)]
// All entries are package-managed — always overwritten in --yes mode.

const FILES = [
  // Claude Code — deployed as tsfpp.md, not CLAUDE.md, to avoid overwriting project context
  ['ai/claude/tsfpp.md', '.claude/tsfpp.md'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function confirm(question) {
  return (await ask(question)) === 'y';
}

// ─── Workspace detection ──────────────────────────────────────────────────────

async function detectWorkspacePackages() {
  const wsFile = join(cwd, 'pnpm-workspace.yaml');
  if (!existsSync(wsFile)) return null;

  const yaml     = await readFile(wsFile, 'utf8');
  const patterns = [...yaml.matchAll(/^\s*-\s*['"]?([^'"#\n]+?)['"]?\s*$/gm)]
    .map(m => m[1].trim().replace(/\/\*\*?$/, ''));

  const IGNORE = new Set(['dist', 'build', 'out', 'coverage', 'node_modules', '.git', '.turbo', 'tmp']);

  const packages = [];
  for (const pattern of patterns) {
    const absPattern = join(cwd, pattern);
    if (!existsSync(absPattern)) continue;
    const entries = await readdir(absPattern, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORE.has(entry.name)) {
        packages.push(`${pattern}/${entry.name}`);
      }
    }
  }
  return packages.length > 0 ? packages : null;
}

// ─── ESLint config ────────────────────────────────────────────────────────────

const ESLINT_PROFILES = {
  base:  { import: `import tsfpp from '@tsfpp/eslint-config'`,            spread: 'tsfpp' },
  react: { import: `import tsfppReact from '@tsfpp/eslint-config/react'`, spread: 'tsfppReact' },
  api:   { import: `import tsfppApi from '@tsfpp/eslint-config/api'`,     spread: 'tsfppApi' },
};

async function askProfile(label) {
  console.log(`\n  ESLint profile for ${bold(label)}:`);
  console.log(`  ${dim('1')} base  ${dim('— TypeScript / Node.js')}`);
  console.log(`  ${dim('2')} react ${dim('— React / TSX')}`);
  console.log(`  ${dim('3')} api   ${dim('— HTTP API / Node.js servers')}`);
  const choice = await ask(`  ${dim('[1/2/3, default: 1]')} `);
  return choice === '2' ? 'react' : choice === '3' ? 'api' : 'base';
}

function generateMonorepoEslint(packageProfiles) {
  const usedProfiles = [...new Set(Object.values(packageProfiles))];
  const imports = usedProfiles.map(p => ESLINT_PROFILES[p].import).join('\n');

  const basePackages = Object.entries(packageProfiles)
    .filter(([, p]) => p === 'base')
    .map(([pkg]) => `'${pkg}/src/**'`);

  const scopedBlocks = ['react', 'api'].flatMap(profile => {
    const pkgs = Object.entries(packageProfiles)
      .filter(([, p]) => p === profile)
      .map(([pkg]) => `'${pkg}/src/**'`);
    if (pkgs.length === 0) return [];
    const spread = ESLINT_PROFILES[profile].spread;
    return [`  // ${profile}`, `  ...${spread}.map(c => ({ ...c, files: [${pkgs.join(', ')}] })),`];
  });

  const baseSpread = basePackages.length > 0
    ? `  // base\n  ...tsfpp.map(c => ({ ...c, files: [${basePackages.join(', ')}] })),`
    : `  // base — applies to all files not matched by a scoped profile\n  ...tsfpp,`;

  return [imports, '', 'export default [', baseSpread, ...scopedBlocks, ']', ''].join('\n');
}

function generateSingleEslint(profile) {
  const { import: imp, spread } = ESLINT_PROFILES[profile];
  return `${imp}\nexport default [...${spread}]\n`;
}

async function writeEslintConfig(results) {
  const packages = await detectWorkspacePackages();
  let content, description;

  if (packages) {
    console.log(`\n  Monorepo detected — ${packages.length} package(s) found.\n`);
    const packageProfiles = {};
    for (const pkg of packages) packageProfiles[pkg] = await askProfile(pkg);
    content     = generateMonorepoEslint(packageProfiles);
    description = 'monorepo';
  } else {
    const profile = await askProfile('this project');
    content       = generateSingleEslint(profile);
    description   = `profile: ${profile}`;
  }

  try {
    await writeFile(join(cwd, 'eslint.config.js'), content, 'utf8');
    results.copied.push('eslint.config.js');
    console.log(`\n  ${green('✓')} eslint.config.js ${dim(`(${description})`)}`);
  } catch (err) {
    results.failed.push('eslint.config.js');
    console.log(`\n  \x1b[31m✗\x1b[0m eslint.config.js ${dim(`(${err.message})`)}`);
  }
}

// ─── tsconfig generation ──────────────────────────────────────────────────────

const TSCONFIG_PRESETS = {
  app: '@tsfpp/tsconfig/app',
  lib: '@tsfpp/tsconfig/lib',
};

async function askPreset(label) {
  console.log(`\n  tsconfig preset for ${bold(label)}:`);
  console.log(`  ${dim('1')} app ${dim('— application / tool (noEmit: true)')}`);
  console.log(`  ${dim('2')} lib ${dim('— publishable package (declaration, composite)')}`);
  console.log(`  ${dim('N')} skip`);
  const choice = await ask(`  ${dim('[1/2/N, default: 1]')} `);
  if (choice === 'n') return null;
  return choice === '2' ? 'lib' : 'app';
}

function generateTsConfig(preset) {
  return JSON.stringify(
    { extends: TSCONFIG_PRESETS[preset], compilerOptions: { rootDir: 'src' }, include: ['src'] },
    null, 2
  ) + '\n';
}

function generateRootTsConfig(packagePaths) {
  return JSON.stringify(
    { files: [], references: packagePaths.map(p => ({ path: p })) },
    null, 2
  ) + '\n';
}

async function writeIfConfirmed(destPath, content, label, results) {
  if (existsSync(destPath)) {
    const overwrite = await confirm(
      `  ${yellow('!')} ${label} already exists. Overwrite? ${dim('[y/N]')} `
    );
    if (!overwrite) {
      results.skipped.push(label);
      console.log(`  ${dim('–')} ${dim(label)} ${dim('(skipped)')}`);
      return;
    }
  }
  try {
    await ensureDir(destPath);
    await writeFile(destPath, content, 'utf8');
    results.copied.push(label);
    console.log(`  ${green('✓')} ${label}`);
  } catch (err) {
    results.failed.push(label);
    console.log(`  \x1b[31m✗\x1b[0m ${label} ${dim(`(${err.message})`)}`);
  }
}

async function writeTsConfigs(results) {
  const packages = await detectWorkspacePackages();

  if (packages) {
    console.log(`  Generating tsconfig.json per package.\n`);
    const packagePresets = {};
    for (const pkg of packages) packagePresets[pkg] = await askPreset(pkg);

    for (const [pkg, preset] of Object.entries(packagePresets)) {
      if (preset === null) {
        results.skipped.push(`${pkg}/tsconfig.json`);
        console.log(`  ${dim('–')} ${dim(`${pkg}/tsconfig.json`)} ${dim('(skipped)')}`);
        continue;
      }
      await writeIfConfirmed(join(cwd, pkg, 'tsconfig.json'), generateTsConfig(preset), `${pkg}/tsconfig.json`, results);
    }
    await writeIfConfirmed(join(cwd, 'tsconfig.json'), generateRootTsConfig(packages), 'tsconfig.json (root references)', results);
  } else {
    const preset = await askPreset('this project');
    if (preset === null) {
      results.skipped.push('tsconfig.json');
      console.log(`  ${dim('–')} ${dim('tsconfig.json')} ${dim('(skipped)')}`);
    } else {
      await writeIfConfirmed(join(cwd, 'tsconfig.json'), generateTsConfig(preset), 'tsconfig.json', results);
    }
  }
}


async function buildUniversalAiLayout(results) {
  try {
    await buildAiLayout();
    results.copied.push('ai.md', '.ai/', '.github/');
    console.log(`  ${green('✓')} ai.md ${dim('(canonical source)')}`);
    console.log(`  ${green('✓')} .ai/ ${dim('(generated universal sources)')}`);
    console.log(`  ${green('✓')} .github/ ${dim('(generated Copilot-compatible output)')}`);
  } catch (err) {
    results.failed.push('ai.md', '.ai/', '.github/');
    console.log(`  \x1b[31m✗\x1b[0m ai.md/.ai/.github ${dim(`(${err.message})`)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(bold('  @tsfpp/agents — init') + (YES ? dim('  (--yes)') : ''));
  if (YES) {
    console.log(dim('  Generating the universal AI layout. eslint.config.js and tsconfig.json are not touched.\n'));
  } else {
    console.log(dim('  Sets up the universal AI sources, generated compatibility output, and ESLint config.\n'));
  }

  const results = { copied: [], skipped: [], failed: [] };

  // ── Universal AI layout ────────────────────────────────────────────────────

  await buildUniversalAiLayout(results);

  // ── Claude Code configuration ──────────────────────────────────────────────

  for (const [src, dest] of FILES) {
    const srcPath  = join(__dirname, src);
    const destPath = join(cwd, dest);

    if (!existsSync(srcPath)) {
      results.skipped.push(dest);
      console.log(`  ${dim('–')} ${dim(dest)} ${dim('(source not found — skipped)')}`);
      continue;
    }

    if (existsSync(destPath) && !YES) {
      const overwrite = await confirm(
        `  ${yellow('!')} ${dest} already exists. Overwrite? ${dim('[y/N]')} `
      );
      if (!overwrite) {
        results.skipped.push(dest);
        console.log(`  ${dim('–')} ${dim(dest)} ${dim('(skipped)')}`);
        continue;
      }
    }

    try {
      await ensureDir(destPath);
      await copyFile(srcPath, destPath);
      results.copied.push(dest);
      console.log(`  ${green('✓')} ${dest}`);
    } catch (err) {
      results.failed.push(dest);
      console.log(`  \x1b[31m✗\x1b[0m ${dest} ${dim(`(${err.message})`)}`);
    }
  }

  // ── ESLint (interactive only) ──────────────────────────────────────────────

  if (!YES) {
    console.log();
    const eslintDest = join(cwd, 'eslint.config.js');
    if (existsSync(eslintDest)) {
      const overwrite = await confirm(
        `  ${yellow('!')} eslint.config.js already exists. Overwrite? ${dim('[y/N]')} `
      );
      if (!overwrite) {
        results.skipped.push('eslint.config.js');
        console.log(`  ${dim('–')} ${dim('eslint.config.js')} ${dim('(skipped)')}`);
      } else {
        await writeEslintConfig(results);
      }
    } else {
      await writeEslintConfig(results);
    }
  }

  // ── tsconfig (interactive only) ────────────────────────────────────────────

  if (!YES) {
    console.log();
    await writeTsConfigs(results);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log();
  console.log(dim('  ─────────────────────────────────────────'));
  console.log(`  ${green(results.copied.length + ' copied')}  ${yellow(results.skipped.length + ' skipped')}  ${results.failed.length > 0 ? `\x1b[31m${results.failed.length} failed\x1b[0m` : dim('0 failed')}`);
  console.log();

  if (results.failed.length === 0) {
    console.log('  ' + bold('Done.') + ' Reload your editor to activate the generated instructions.');
    console.log(dim('  Claude Code context available at .claude/tsfpp.md — add @tsfpp to your CLAUDE.md to activate.'));
    console.log(dim('  Commit the generated files — they are workspace configuration.\n'));
  } else {
    console.log('  Some files could not be copied. Check the errors above.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
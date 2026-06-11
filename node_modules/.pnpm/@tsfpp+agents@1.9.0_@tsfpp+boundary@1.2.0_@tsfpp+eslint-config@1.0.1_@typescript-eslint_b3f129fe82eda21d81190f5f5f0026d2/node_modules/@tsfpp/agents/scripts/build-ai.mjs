#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, '..');
const sourceRoot = join(packageRoot, 'ai');
const universalRoot = join(process.cwd(), '.ai');
const githubRoot = join(process.cwd(), '.github');

const trimTrailingNewline = (value) => value.replace(/\n+$/, '\n');

function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: '', body: content };
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { frontmatter: '', body: content };
  }

  const frontmatter = content.slice(4, endIndex).trimEnd();
  const body = content.slice(endIndex + 5).replace(/^\n+/, '');
  return { frontmatter, body };
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, trimTrailingNewline(content), 'utf8');
}

async function copyRootGuide() {
  const content = await readFile(join(packageRoot, 'ai.md'), 'utf8');
  const { body } = splitFrontmatter(content);

  await writeText(join(process.cwd(), 'ai.md'), body);
}

async function compileCopilotInstructions() {
  const sourcePath = join(sourceRoot, 'copilot-instructions.md');

  try {
    await compileFile(
      sourcePath,
      join(universalRoot, 'copilot-instructions.md'),
      join(githubRoot, 'copilot-instructions.md'),
    );
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const content = await readFile(join(packageRoot, 'ai.md'), 'utf8');
      const { body } = splitFrontmatter(content);

      await writeText(join(universalRoot, 'copilot-instructions.md'), body);
      await writeText(join(githubRoot, 'copilot-instructions.md'), body);
      return;
    }

    throw error;
  }
}

async function compileFile(sourcePath, universalPath, githubPath) {
  const content = await readFile(sourcePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(content);

  await writeText(universalPath, body);
  if (frontmatter) {
    await writeText(universalPath.replace(/\.md$/, '.frontmatter.yaml'), `${frontmatter}\n`);
  }

  const githubContent = frontmatter
    ? `---\n${frontmatter}\n---\n\n${body}`
    : body;

  await writeText(githubPath, githubContent);
}

async function compileAgents() {
  const agentDir = join(sourceRoot, 'agents');
  const agentFiles = (await readdir(agentDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.agent.md'))
    .map((entry) => entry.name)
    .sort();

  for (const fileName of agentFiles) {
    const sourcePath = join(agentDir, fileName);
    const baseName = fileName.replace(/\.agent\.md$/, '');
    await compileFile(
      sourcePath,
      join(universalRoot, 'agents', `${baseName}.md`),
      join(githubRoot, 'agents', fileName),
    );
  }
}

async function compileInstructions() {
  const instructionDir = join(sourceRoot, 'instructions');
  const instructionFiles = (await readdir(instructionDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.instructions.md'))
    .map((entry) => entry.name)
    .sort();

  for (const fileName of instructionFiles) {
    const sourcePath = join(instructionDir, fileName);
    const baseName = fileName.replace(/\.instructions\.md$/, '');
    await compileFile(
      sourcePath,
      join(universalRoot, 'instructions', `${baseName}.md`),
      join(githubRoot, 'instructions', fileName),
    );
  }
}

async function compilePrompts() {
  const promptDir = join(sourceRoot, 'prompts');
  const promptFiles = (await readdir(promptDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.prompt.md'))
    .map((entry) => entry.name)
    .sort();

  for (const fileName of promptFiles) {
    const sourcePath = join(promptDir, fileName);
    const baseName = fileName.replace(/\.prompt\.md$/, '');
    await compileFile(
      sourcePath,
      join(universalRoot, 'prompts', `${baseName}.md`),
      join(githubRoot, 'prompts', fileName),
    );
  }
}

async function compileSkills() {
  const skillsRoot = join(sourceRoot, 'skills');
  const skillDirs = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skillName of skillDirs) {
    const sourcePath = join(skillsRoot, skillName, 'SKILL.md');
    await compileFile(
      sourcePath,
      join(universalRoot, 'skills', skillName, 'SKILL.md'),
      join(githubRoot, 'skills', skillName, 'SKILL.md'),
    );
  }
}

async function compileWorkflows() {
  const workflowDir = join(sourceRoot, 'workflows');
  let workflowFiles;

  try {
    workflowFiles = (await readdir(workflowDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const fileName of workflowFiles) {
    const sourcePath = join(workflowDir, fileName);
    const content = await readFile(sourcePath, 'utf8');
    await writeText(join(githubRoot, 'workflows', fileName), content);
  }
}

export async function buildAiLayout() {
  await copyRootGuide();
  await compileCopilotInstructions();
  await compileAgents();
  await compileInstructions();
  await compilePrompts();
  await compileSkills();
  await compileWorkflows();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildAiLayout();
}

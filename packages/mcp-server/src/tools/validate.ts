/**
 * Validation-oriented MCP tools for cnj documents.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parse, toCnjModel, describeCnjModelError, validateCnj, collectSymbolRefs, isCnjFileReference } from '@conjurer/core';
import type { ValidationMode, SymbolIndex, EdnNode, CnjDocument } from '@conjurer/core';
import { isErr, isDefined } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

const parseMode = (mode: string | undefined = undefined): ValidationMode =>
  mode === 'recovered' ? 'recovered' : 'authored';

export type ValidateContext = {
  readonly index: SymbolIndex;
};

/**
 * Parse the local `.cnj` files a charter references, so reference keywords resolve across the
 * project. Unreadable or unparsable files are skipped; `references-resolve` reports them.
 *
 * @param filePath - The validated file.
 * @param references - Its charter `:references`.
 * @returns The referenced documents that could be read.
 */
const loadReferencedDocs = (filePath: string, references: ReadonlyArray<string>): ReadonlyArray<CnjDocument> =>
  references
    .filter(isCnjFileReference)
    .map((ref) => resolvePath(dirname(filePath), ref))
    .filter((path) => existsSync(path))
    .flatMap((path): ReadonlyArray<CnjDocument> => {
      const ast = parse(readFileSync(path, 'utf8'));
      if (isErr(ast)) return [];
      const model = toCnjModel(ast.value, path);
      return isErr(model) ? [] : [model.value];
    });

/** Options for validate_cnj: the mode, strictness, and the symbol index when one is loaded. */
export type ValidateRequest = {
  readonly mode?: string;
  readonly strict?: boolean;
  readonly index?: SymbolIndex;
};

export const handleValidate = (filePath: string, request: ValidateRequest = {}): ToolContent => {
  const { mode, strict, index } = request;
  if (!existsSync(filePath)) return toContent(`File not found: ${filePath}`);
  const src = readFileSync(filePath, 'utf8');
  const parsed = parse(src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) return toContent(`Model error: ${describeCnjModelError(doc.error)}`);
  const symbolRefs = isDefined(index) ? collectSymbolRefs(parsed.value) : undefined;
  // A URL reference is not a file to read; only local paths are checked.
  const referencesStatus = doc.value.charter.references.map((ref) => ({
    ref,
    exists: /^https?:\/\//.test(ref) || existsSync(resolvePath(dirname(filePath), ref)),
  }));
  const referencedDocs = loadReferencedDocs(filePath, doc.value.charter.references);
  const base = { referencesStatus, referencedDocs, ast: parsed.value };
  const report = validateCnj(
    doc.value,
    parseMode(mode),
    isDefined(index) && isDefined(symbolRefs) ? { ...base, index, symbolRefs } : base,
  );
  const effectiveValid = strict === true ? report.violations.length === 0 : report.valid;
  return toContent(JSON.stringify(
    { valid: effectiveValid, violations: report.violations },
    null, 2,
  ));
};

// ── lint_disk_consistency helpers ────────────────────────────────────────────

const SKIP_DIRS: ReadonlyArray<string> = ['node_modules', 'dist', '.git', 'coverage', '.turbo'];

const inSkipDir = (rel: string): boolean =>
  SKIP_DIRS.some((d) => rel.split('/').includes(d));

const moduleExistsInTree = (root: string, filename: string): boolean => {
  try {
    const entries: ReadonlyArray<string> = readdirSync(root, { recursive: true, encoding: 'utf8' });
    // Normalise separators so 'tools/retrieval.ts' matches on any platform.
    const norm = filename.replace(/\\/g, '/');
    return entries.some((rel) => {
      const normRel = rel.replace(/\\/g, '/');
      return !inSkipDir(normRel) && (normRel === norm || normRel.endsWith('/' + norm));
    });
  } catch {
    return false;
  }
};

const edNodeStr = (n: EdnNode): string => {
  if (n.type === 'string' || n.type === 'symbol') return n.value;
  if (n.type === 'keyword') return n.value.substring(1);
  return '';
};

const modFileName = (m: ReadonlyMap<string, EdnNode>): string => {
  const n = m.get('module');
  return n !== undefined ? edNodeStr(n) : '';
};

/**
 * Compare declared :modules (in targets) and charter :references against the filesystem.
 *
 * @param filePath - Path to the .cnj file.
 * @param rootDir - Directory root to search for module files; defaults to dirname(filePath).
 * @returns Tool text content payload.
 */
export const handleLintDiskConsistency = (
  filePath: string,
  rootDir?: string,
): ToolContent => {
  const abs = resolvePath(filePath);
  if (!existsSync(abs)) return toContent(`File not found: ${filePath}`);

  const src = readFileSync(abs, 'utf8');
  const parsed = parse(src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);
  const docRes = toCnjModel(parsed.value, abs);
  if (isErr(docRes)) return toContent(`Model error: ${describeCnjModelError(docRes.error)}`);
  const doc = docRes.value;

  const searchRoot = resolvePath(rootDir ?? dirname(abs));
  const fileDir = dirname(abs);

  const allModuleDecls = doc.targets.flatMap((t) =>
    t.modules
      .map((m) => ({ target: t.name, module: modFileName(m) }))
      .filter((m) => m.module.length > 0),
  );
  const missingModules = allModuleDecls.filter((m) => !moduleExistsInTree(searchRoot, m.module));
  const declaredModules = allModuleDecls.length;

  const missingRefs = doc.charter.references
    .map((ref) => ({ ref, resolved_to: resolvePath(fileDir, ref) }))
    .filter(({ resolved_to }) => !existsSync(resolved_to));

  const issueCount = missingModules.length + missingRefs.length;

  return toContent(JSON.stringify({
    consistent: issueCount === 0,
    issue_count: issueCount,
    modules: {
      declared: declaredModules,
      found: declaredModules - missingModules.length,
      missing: missingModules,
    },
    references: {
      declared: doc.charter.references.length,
      found: doc.charter.references.length - missingRefs.length,
      missing: missingRefs,
    },
  }, null, 2));
};

export const registerValidateTools = (server: McpServer, ctx?: ValidateContext): void => {
  server.registerTool('validate_cnj', {
    description: 'Check a .cnj file against structural rules and report violations',
    inputSchema: {
      path: z.string(),
      mode: z.enum(['authored', 'recovered']).optional(),
      strict: z.boolean().optional(),
    },
  }, ({ path, mode, strict }) => ({
    content: [...handleValidate(path, {
      ...(mode !== undefined ? { mode } : {}),
      ...(strict !== undefined ? { strict } : {}),
      ...(ctx !== undefined ? { index: ctx.index } : {}),
    })],
  }));

  server.registerTool('lint_disk_consistency', {
    description:
      'Compare declared :modules (in targets) and charter :references in a .cnj file ' +
      'against the actual filesystem — catches the .cnj lying about what exists',
    inputSchema: {
      path: z.string().describe('Path to the .cnj file'),
      root: z.string().optional().describe(
        'Directory root to search for module files; defaults to dirname(path)',
      ),
    },
  }, ({ path, root }) => ({ content: [...handleLintDiskConsistency(path, root)] }));
};

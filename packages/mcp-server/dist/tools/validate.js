/**
 * Validation-oriented MCP tools for cnj documents.
 */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): SDK interop surfaces mutable shape annotations in adapter code paths. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { z } from 'zod';
import { parse, toCnjModel, validateCnj, collectSymbolRefs } from '@conjurer/core';
import { isErr, isDefined } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
const parseMode = (mode = undefined) => mode === 'recovered' ? 'recovered' : 'authored';
export const handleValidate = (filePath, mode = undefined, strict = undefined, index = undefined) => {
    if (!existsSync(filePath))
        return toContent(`File not found: ${filePath}`);
    const src = readFileSync(filePath, 'utf8');
    const parsed = parse(src);
    if (isErr(parsed))
        return toContent(`Parse error: ${parsed.error.message}`);
    const doc = toCnjModel(parsed.value, filePath);
    if (isErr(doc))
        return toContent(`Model error: ${doc.error}`);
    const symbolRefs = isDefined(index) ? collectSymbolRefs(parsed.value) : undefined;
    const referencesStatus = doc.value.charter.references.map((ref) => ({
        ref,
        exists: existsSync(resolvePath(dirname(filePath), ref)),
    }));
    const report = validateCnj(doc.value, parseMode(mode), isDefined(index) && isDefined(symbolRefs)
        ? { index, symbolRefs, referencesStatus }
        : { referencesStatus });
    const effectiveValid = strict === true ? report.violations.length === 0 : report.valid;
    return toContent(JSON.stringify({ valid: effectiveValid, violations: report.violations }, null, 2));
};
// ── lint_disk_consistency helpers ────────────────────────────────────────────
const SKIP_DIRS = ['node_modules', 'dist', '.git', 'coverage', '.turbo'];
const inSkipDir = (rel) => SKIP_DIRS.some((d) => rel.split('/').includes(d));
const moduleExistsInTree = (root, filename) => {
    try {
        const entries = readdirSync(root, { recursive: true });
        // Normalise separators so 'tools/retrieval.ts' matches on any platform.
        const norm = filename.replace(/\\/g, '/');
        return entries.some((rel) => {
            const normRel = rel.replace(/\\/g, '/');
            return !inSkipDir(normRel) && (normRel === norm || normRel.endsWith('/' + norm));
        });
    }
    catch {
        return false;
    }
};
const edNodeStr = (n) => {
    if (n.type === 'string' || n.type === 'symbol')
        return n.value;
    if (n.type === 'keyword')
        return n.value.substring(1);
    return '';
};
const modFileName = (m) => {
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
export const handleLintDiskConsistency = (filePath, rootDir) => {
    const abs = resolvePath(filePath);
    if (!existsSync(abs))
        return toContent(`File not found: ${filePath}`);
    const src = readFileSync(abs, 'utf8');
    const parsed = parse(src);
    if (isErr(parsed))
        return toContent(`Parse error: ${parsed.error.message}`);
    const docRes = toCnjModel(parsed.value, abs);
    if (isErr(docRes))
        return toContent(`Model error: ${docRes.error}`);
    const doc = docRes.value;
    const searchRoot = resolvePath(rootDir ?? dirname(abs));
    const fileDir = dirname(abs);
    const allModuleDecls = doc.targets.flatMap((t) => t.modules
        .map((m) => ({ target: t.name, module: modFileName(m) }))
        .filter((m) => m.module.length > 0));
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
export const registerValidateTools = (server, ctx) => {
    server.registerTool('validate_cnj', {
        description: 'Check a .cnj file against structural rules and report violations',
        inputSchema: {
            path: z.string(),
            mode: z.enum(['authored', 'recovered']).optional(),
            strict: z.boolean().optional(),
        },
    }, ({ path, mode, strict }) => ({ content: [...handleValidate(path, mode, strict, ctx?.index)] }));
    server.registerTool('lint_disk_consistency', {
        description: 'Compare declared :modules (in targets) and charter :references in a .cnj file ' +
            'against the actual filesystem — catches the .cnj lying about what exists',
        inputSchema: {
            path: z.string().describe('Path to the .cnj file'),
            root: z.string().optional().describe('Directory root to search for module files; defaults to dirname(path)'),
        },
    }, ({ path, root }) => ({ content: [...handleLintDiskConsistency(path, root)] }));
};

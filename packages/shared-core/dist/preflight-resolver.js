import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ok, err, isErr, isSome, fromNullable } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import { toCnjModel } from './cnj-model.js';
const parseCnjFile = (filePath) => {
    if (!existsSync(filePath))
        return err(`File not found: ${filePath}`);
    const content = readFileSync(filePath, 'utf8');
    const parsed = parse(content);
    if (isErr(parsed))
        return err(`Parse error in ${filePath}: ${parsed.error.message}`);
    return toCnjModel(parsed.value, filePath);
};
const findCnjFiles = (folder) => {
    if (!existsSync(folder))
        return [];
    return readdirSync(folder)
        .filter((f) => f.endsWith('.cnj'))
        .map((f) => join(folder, f));
};
const parseDocs = (files) => files.flatMap((f) => {
    const r = parseCnjFile(f);
    return isErr(r) ? [] : [r.value];
});
const allTargetNames = (docs) => docs.flatMap((d) => d.targets.map((t) => t.name));
const modulePathsOf = (target) => {
    const pkg = `packages/${target.name}/src/`;
    return target.modules.flatMap((m) => {
        const nameNode = fromNullable(m.get('name'));
        if (!isSome(nameNode) || nameNode.value.type !== 'string')
            return [];
        return [`${pkg}${nameNode.value.value}`];
    });
};
const checkTargetDeps = (target, sourceFile, known) => {
    if (target.from === undefined)
        return { resolved: [], unresolved: [] };
    const dep = target.from;
    const isResolved = known.includes(dep);
    return isResolved
        ? { resolved: [{ from: sourceFile, to: dep, outsideFolder: false }], unresolved: [] }
        : { resolved: [], unresolved: [{ from: sourceFile, target: dep, reason: `Target '${dep}' not declared` }] };
};
const collectDeps = (docs, known) => {
    const checks = docs.flatMap((d) => d.targets.map((t) => checkTargetDeps(t, d.sourceFile, known)));
    return {
        resolved: checks.flatMap((c) => c.resolved),
        unresolved: checks.flatMap((c) => c.unresolved),
    };
};
const collectMissingPaths = (docs, root) => docs.flatMap((d) => d.targets.flatMap((t) => modulePathsOf(t).flatMap((p) => {
    const abs = join(root, p);
    return existsSync(abs) ? [] : [{ path: p, reason: 'Module file not found on disk' }];
})));
export const runMaterialisePreflight = (folder, projectName, entryFiles) => {
    const files = entryFiles !== undefined && entryFiles.length > 0
        ? entryFiles
        : findCnjFiles(folder);
    if (files.length === 0)
        return err(`No .cnj files found in ${folder}`);
    const docs = parseDocs(files);
    const known = allTargetNames(docs);
    const deps = collectDeps(docs, known);
    const missing = collectMissingPaths(docs, folder);
    const name = projectName ?? 'conjurer-mcp';
    return ok({
        projectName: name,
        packageJsonRequired: true,
        resolvedRefs: deps.resolved,
        unresolvedRefs: deps.unresolved,
        missingPaths: missing,
        ready: deps.unresolved.length === 0,
    });
};
//# sourceMappingURL=preflight-resolver.js.map
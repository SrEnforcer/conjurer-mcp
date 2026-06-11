import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ok, err, isErr } from '@tsfpp/prelude';
import { parse } from './edn-parser.js';
import { toCnjModel } from './cnj-model.js';
const parseEntry = (filePath) => {
    if (!existsSync(filePath))
        return err(`File not found: ${filePath}`);
    const content = readFileSync(filePath, 'utf8');
    const parsed = parse(content);
    if (isErr(parsed))
        return err(`Parse error in ${filePath}: ${parsed.error.message}`);
    const doc = toCnjModel(parsed.value, filePath);
    if (isErr(doc))
        return err(`Model error in ${filePath}: ${doc.error}`);
    const dir = dirname(filePath);
    const directRefs = doc.value.charter.references
        .map((ref) => resolve(dir, ref))
        .filter((abs) => abs !== filePath);
    return ok({ path: filePath, content, doc: doc.value, directRefs });
};
const discoverFiles = (entryFile) => {
    // DEVIATION(2.4): Mutable accumulator within a bounded discovery loop.
    const visited = new Map();
    const queue = [resolve(entryFile)];
    while (queue.length > 0) {
        const next = queue.shift();
        if (next === undefined || visited.has(next))
            continue;
        const entry = parseEntry(next);
        if (isErr(entry))
            continue;
        visited.set(next, entry.value);
        // Follow one level of charter :references
        for (const ref of entry.value.directRefs) {
            if (!visited.has(ref))
                queue.push(ref);
        }
    }
    return visited;
};
const buildTargetEdges = (files) => {
    // DEVIATION(2.4): Mutable accumulator for target dependency graph construction.
    const edges = new Map();
    for (const entry of files.values()) {
        for (const target of entry.doc.targets) {
            const froms = target.from !== undefined ? [target.from] : [];
            edges.set(target.name, froms);
        }
    }
    return edges;
};
const visitTarget = (name, edges, state) => {
    if (state.visiting.has(name))
        return { ...state, cycleDetected: true };
    if (state.visited.has(name))
        return state;
    const deps = edges.get(name) ?? [];
    const withVisiting = {
        ...state,
        visiting: new Set([...state.visiting, name]),
    };
    const afterDeps = deps.reduce((s, dep) => visitTarget(dep, edges, s), withVisiting);
    return {
        sorted: [...afterDeps.sorted, name],
        visiting: new Set([...afterDeps.visiting].filter((v) => v !== name)),
        visited: new Set([...afterDeps.visited, name]),
        cycleDetected: afterDeps.cycleDetected,
    };
};
export const topoOrder = (snapshot, entryFile) => {
    const entry = snapshot.files.get(resolve(entryFile));
    if (entry === undefined)
        return [];
    const targetNames = entry.doc.targets.map((t) => t.name);
    const initial = {
        sorted: [],
        visiting: new Set(),
        visited: new Set(),
        cycleDetected: false,
    };
    const result = targetNames.reduce((s, name) => visitTarget(name, snapshot.targetEdges, s), initial);
    return result.sorted;
};
export const computeContextKey = (snapshot, files) => {
    const h = createHash('sha256');
    for (const f of [...files].sort()) {
        const entry = snapshot.files.get(f);
        if (entry !== undefined)
            h.update(entry.content);
    }
    return h.digest('hex').slice(0, 16);
};
export const buildWorkspaceSnapshot = (entryFile) => {
    if (!existsSync(entryFile))
        return err(`Entry file not found: ${entryFile}`);
    const files = discoverFiles(entryFile);
    if (files.size === 0)
        return err(`Could not parse entry file: ${entryFile}`);
    const targetEdges = buildTargetEdges(files);
    const initial = {
        sorted: [],
        visiting: new Set(),
        visited: new Set(),
        cycleDetected: false,
    };
    const allTargets = Array.from(targetEdges.keys());
    const topoResult = allTargets.reduce((s, name) => visitTarget(name, targetEdges, s), initial);
    return ok({ files, targetEdges, cycleDetected: topoResult.cycleDetected });
};
//# sourceMappingURL=workspace-state.js.map
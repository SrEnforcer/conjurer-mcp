import { ok, err, intoMap, isSome, fromNullable } from '@tsfpp/prelude';
const nodeStr = (n) => {
    if (n.type === 'string')
        return n.value;
    if (n.type === 'keyword')
        return n.value.substring(1);
    if (n.type === 'symbol')
        return n.value;
    return '';
};
const nodeStrList = (n) => {
    if (n.type === 'list')
        return n.elements.map(nodeStr).filter((s) => s.length > 0);
    if (n.type === 'string' || n.type === 'keyword' || n.type === 'symbol')
        return [nodeStr(n)];
    return [];
};
const collectKV = (elems, i, acc) => {
    const key = fromNullable(elems[i]);
    const val = fromNullable(elems[i + 1]);
    if (!isSome(key) || !isSome(val) || key.value.type !== 'keyword')
        return acc;
    return collectKV(elems, i + 2, [...acc, [key.value.value.substring(1), val.value]]);
};
const kvMap = (elems, start) => intoMap(collectKV(elems, start, []));
const getNode = (m, key) => m.get(key);
const getStr = (m, key) => {
    const n = getNode(m, key);
    return n !== undefined ? nodeStr(n) : '';
};
const getList = (m, key) => {
    const n = getNode(m, key);
    return n !== undefined ? nodeStrList(n) : [];
};
const getEdnList = (m, key) => {
    const n = getNode(m, key);
    return n !== undefined && n.type === 'list' ? n.elements : [];
};
const getMaps = (m, key) => getEdnList(m, key).flatMap((n) => (n.type === 'map' ? [n.entries] : []));
const getMap = (m, key) => {
    const n = getNode(m, key);
    return n !== undefined && n.type === 'map' ? n.entries : intoMap([]);
};
const getScores = (m, key) => {
    const n = getNode(m, key);
    if (n === undefined || n.type !== 'map')
        return intoMap([]);
    return intoMap(Array.from(n.entries.entries()).flatMap(([k, v]) => v.type === 'number' ? [[k, v.value]] : []));
};
const parseCharter = (elems) => {
    const titleNode = fromNullable(elems[1]);
    const title = isSome(titleNode) ? nodeStr(titleNode.value) : '';
    const kv = kvMap(elems, 2);
    return {
        title,
        version: getStr(kv, 'version'),
        goals: getList(kv, 'goals'),
        decisions: getMaps(kv, 'decisions'),
        open: getList(kv, 'open'),
        references: getList(kv, 'references'),
        outputs: getMap(kv, 'outputs'),
        audience: getMap(kv, 'audience'),
    };
};
const parseAsset = (elems) => {
    const nameNode = fromNullable(elems[1]);
    if (!isSome(nameNode))
        return undefined;
    const name = nodeStr(nameNode.value);
    if (name.length === 0)
        return undefined;
    const kv = kvMap(elems, 2);
    return {
        name,
        type: getStr(kv, 'type'),
        appliesTo: getList(kv, 'applies-to'),
    };
};
const parseTarget = (elems) => {
    const nameNode = fromNullable(elems[1]);
    if (!isSome(nameNode))
        return undefined;
    const name = nodeStr(nameNode.value);
    if (name.length === 0)
        return undefined;
    const kv = kvMap(elems, 2);
    const from = getStr(kv, 'from');
    return {
        name,
        language: getStr(kv, 'language'),
        standard: getStr(kv, 'standard'),
        produces: getList(kv, 'produces'),
        modules: getMaps(kv, 'modules'),
        ...(from.length > 0 ? { from } : {}),
    };
};
const formName = (elems) => {
    const head = fromNullable(elems[0]);
    return isSome(head) && head.value.type === 'symbol' ? head.value.value : '';
};
const parseReassess = (elems) => {
    // (f/reassess :of IDENTIFIER :date "..." ...) — :of is syntactic; kv starts at index 1
    const kv = kvMap(elems, 1);
    const of_ = getStr(kv, 'of');
    if (of_.length === 0)
        return undefined;
    return {
        of: of_,
        date: getStr(kv, 'date'),
        scores: getScores(kv, 'scores'),
        rationale: getStr(kv, 'rationale'),
        status: getStr(kv, 'status'),
    };
};
const getHistory = (m, key) => {
    const n = getNode(m, key);
    if (n === undefined || n.type !== 'list')
        return [];
    return n.elements.flatMap((item) => {
        if (item.type !== 'list' || item.elements.length === 0)
            return [];
        const head = fromNullable(item.elements[0]);
        if (!isSome(head) || head.value.type !== 'symbol' || head.value.value !== 'f/reassess')
            return [];
        const r = parseReassess(item.elements);
        return r !== undefined ? [r] : [];
    });
};
const parseCandidate = (elems) => {
    const idNode = fromNullable(elems[1]);
    if (!isSome(idNode))
        return undefined;
    const id = nodeStr(idNode.value);
    if (id.length === 0)
        return undefined;
    const kv = kvMap(elems, 2);
    return {
        id,
        label: getStr(kv, 'label'),
        cluster: getStr(kv, 'cluster'),
        status: getStr(kv, 'status'),
        scores: getScores(kv, 'scores'),
        rationale: getStr(kv, 'rationale'),
        conditions: getList(kv, 'conditions'),
        added: getStr(kv, 'added'),
        history: getHistory(kv, 'history'),
    };
};
const parseHoist = (elems) => {
    // (f/hoist :of IDENTIFIER :date "..." ...) — :of is syntactic; kv starts at index 1
    const kv = kvMap(elems, 1);
    const of_ = getStr(kv, 'of');
    if (of_.length === 0)
        return undefined;
    return {
        of: of_,
        date: getStr(kv, 'date'),
        into: getStr(kv, 'into'),
        outcomes: getList(kv, 'outcomes'),
        note: getStr(kv, 'note'),
    };
};
const parseDomainForm = (elems) => {
    const head = fromNullable(elems[0]);
    if (!isSome(head) || head.value.type !== 'symbol')
        return undefined;
    const nameNode = fromNullable(elems[1]);
    const name = isSome(nameNode) ? nodeStr(nameNode.value) : '';
    const kv = kvMap(elems, 2);
    return {
        formType: head.value.value,
        name,
        requires: getList(kv, 'requires'),
        prefers: getList(kv, 'prefers'),
        style: getList(kv, 'style'),
        deferred: getList(kv, 'deferred'),
        manifest: getList(kv, 'manifest'),
    };
};
const processForms = (nodes, acc, i) => {
    const node = fromNullable(nodes[i]);
    if (!isSome(node))
        return acc;
    const n = node.value;
    if (n.type !== 'list')
        return processForms(nodes, acc, i + 1);
    const form = formName(n.elements);
    if (form === 'charter') {
        return processForms(nodes, { ...acc, charter: parseCharter(n.elements) }, i + 1);
    }
    if (form === 'asset') {
        const a = parseAsset(n.elements);
        return processForms(nodes, { ...acc, assets: a !== undefined ? [...acc.assets, a] : acc.assets }, i + 1);
    }
    if (form === 'target') {
        const t = parseTarget(n.elements);
        return processForms(nodes, { ...acc, targets: t !== undefined ? [...acc.targets, t] : acc.targets }, i + 1);
    }
    if (form === 'f/candidate') {
        const c = parseCandidate(n.elements);
        return processForms(nodes, { ...acc, candidates: c !== undefined ? [...acc.candidates, c] : acc.candidates }, i + 1);
    }
    if (form === 'f/hoist') {
        const h = parseHoist(n.elements);
        return processForms(nodes, { ...acc, hoists: h !== undefined ? [...acc.hoists, h] : acc.hoists }, i + 1);
    }
    const d = parseDomainForm(n.elements);
    if (d !== undefined) {
        return processForms(nodes, { ...acc, domainForms: [...acc.domainForms, d] }, i + 1);
    }
    return processForms(nodes, acc, i + 1);
};
const defaultCharter = {
    title: '',
    version: '',
    goals: [],
    decisions: [],
    open: [],
    references: [],
    outputs: intoMap([]),
    audience: intoMap([]),
};
export const toCnjModel = (nodes, sourceFile) => {
    if (nodes.length === 0)
        return err('Empty .cnj file');
    const initial = { charter: undefined, assets: [], targets: [], domainForms: [], candidates: [], hoists: [] };
    const result = processForms(nodes, initial, 0);
    return ok({
        charter: result.charter ?? defaultCharter,
        assets: result.assets,
        targets: result.targets,
        domainForms: result.domainForms,
        candidates: result.candidates,
        hoists: result.hoists,
        sourceFile,
    });
};
//# sourceMappingURL=cnj-model.js.map
/**
 * Parse-oriented MCP tools for .cnj files.
 */
import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { parse, toCnjModel } from '@conjurer/core';
import { isErr, entriesOfMap, fromNullable, isSome, getOrElse, mapO } from '@tsfpp/prelude';
const toContent = (text) => [{ type: 'text', text }];
const ednToJson = (n) => {
    if (n.type === 'map') {
        return Object.fromEntries(entriesOfMap(n.entries).map(([k, v]) => [k, ednToJson(v)]));
    }
    if (n.type === 'list')
        return n.elements.map(ednToJson);
    if (n.type === 'number' || n.type === 'boolean')
        return n.value;
    if (n.type === 'nil')
        return null;
    if (n.type === 'string')
        return n.value;
    return n.type === 'keyword' ? n.value.substring(1) : n.value;
};
const serializeTarget = (t) => ({
    name: t.name,
    language: t.language,
    standard: t.standard,
    produces: t.produces,
    modules: t.modules.map((m) => Object.fromEntries(entriesOfMap(m).map(([k, v]) => [k, ednToJson(v)]))),
    ...(t.from !== undefined ? { from: t.from } : {}),
});
const serializeCharter = (c) => ({
    title: c.title,
    version: c.version,
    goals: c.goals,
    open: c.open,
    references: c.references,
    decisions: c.decisions.map((d) => Object.fromEntries(entriesOfMap(d).map(([k, v]) => [k, ednToJson(v)]))),
});
const serializeAsset = (a) => ({
    name: a.name, type: a.type, appliesTo: a.appliesTo,
});
const readSrc = (filePath, content) => {
    const inlineInput = mapO((src) => ({ src, file: '<inline>' }))(fromNullable(content));
    if (isSome(inlineInput))
        return inlineInput.value;
    const pathOpt = fromNullable(filePath);
    if (isSome(pathOpt) && existsSync(pathOpt.value)) {
        return { src: readFileSync(pathOpt.value, 'utf8'), file: pathOpt.value };
    }
    return undefined;
};
/**
 * Parse a cnj source input into the normalized document model.
 *
 * @param filePath - Input file path.
 * @param content - Inline source content.
 * @returns Tool text content payload.
 */
export const handleParseCnj = (filePath = undefined, content = undefined) => {
    const input = readSrc(filePath, content);
    if (input === undefined)
        return toContent('Provide path or content');
    const parsed = parse(input.src);
    if (isErr(parsed))
        return toContent(`Parse error: ${parsed.error.message}`);
    const doc = toCnjModel(parsed.value, input.file);
    if (isErr(doc))
        return toContent(`Model error: ${doc.error}`);
    return toContent(JSON.stringify({
        charter: serializeCharter(doc.value.charter),
        assets: doc.value.assets.map(serializeAsset),
        targets: doc.value.targets.map(serializeTarget),
    }, null, 2));
};
/**
 * Read selected charter fields from a cnj document.
 *
 * @param filePath - Input file path.
 * @param fields - Optional field whitelist.
 * @returns Tool text content payload.
 */
export const handleReadCharter = (filePath = undefined, fields = undefined) => {
    const input = readSrc(filePath, undefined);
    if (input === undefined) {
        return toContent(`File not found: ${getOrElse(() => '')(fromNullable(filePath))}`);
    }
    const parsed = parse(input.src);
    if (isErr(parsed))
        return toContent(`Parse error: ${parsed.error.message}`);
    const doc = toCnjModel(parsed.value, input.file);
    if (isErr(doc))
        return toContent(`Model error: ${doc.error}`);
    const full = serializeCharter(doc.value.charter);
    const filtered = getOrElse(() => full)(mapO((fieldList) => (fieldList.length > 0
        ? Object.fromEntries(Object.entries(full).filter(([k]) => fieldList.includes(k)))
        : full))(fromNullable(fields)));
    return toContent(JSON.stringify(filtered, null, 2));
};
/**
 * Register parse and charter-read MCP tools.
 *
 * @param server - MCP server instance.
 * @returns No return value.
 */
export const registerParseTools = (server) => {
    server.registerTool('parse_cnj', {
        description: 'Parse a .cnj file into a structured document model',
        inputSchema: { path: z.string().optional(), content: z.string().optional() },
    }, ({ path, content }) => ({ content: [...handleParseCnj(path, content)] }));
    server.registerTool('read_charter', {
        description: 'Return a .cnj file\'s charter fields',
        inputSchema: { path: z.string(), fields: z.array(z.string()).optional() },
    }, ({ path, fields }) => ({ content: [...handleReadCharter(path, fields)] }));
};

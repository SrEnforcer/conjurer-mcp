/**
 * Parse-oriented MCP tools for .cnj files.
 */
import { readFileSync, existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parse, toCnjModel, describeCnjModelError } from '@conjurer/core';
import type { Charter, CnjTarget, CnjAsset } from '@conjurer/core';
import type { EdnNode } from '@conjurer/core';
import { isErr, entriesOf, fromNullable, isSome, getOrElseOption, mapOption } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

const ednToJson = (n: EdnNode): unknown => {
  if (n.type === 'map') {
    return Object.fromEntries(
      entriesOf(n.entries).map(([k, v]: readonly [string, EdnNode]) => [k, ednToJson(v)]),
    );
  }
  if (n.type === 'list') return n.elements.map(ednToJson);
  if (n.type === 'number' || n.type === 'boolean') return n.value;
  if (n.type === 'nil') return null;
  if (n.type === 'string') return n.value;
  return n.type === 'keyword' ? n.value.substring(1) : n.value;
};

const serializeTarget = (t: CnjTarget): Readonly<Record<string, unknown>> => ({
  name: t.name,
  language: t.language,
  standard: t.standard,
  produces: t.produces,
  modules: t.modules.map((m) =>
    Object.fromEntries(entriesOf(m).map(([k, v]: readonly [string, EdnNode]) => [k, ednToJson(v)])),
  ),
  ...(t.from !== undefined ? { from: t.from } : {}),
});

const serializeCharter = (c: Charter): Readonly<Record<string, unknown>> => ({
  title: c.title,
  version: c.version,
  goals: c.goals,
  open: c.open,
  references: c.references,
  decisions: c.decisions.map((d) =>
    Object.fromEntries(entriesOf(d).map(([k, v]: readonly [string, EdnNode]) => [k, ednToJson(v)])),
  ),
});

const serializeAsset = (a: CnjAsset): Readonly<Record<string, unknown>> => ({
  name: a.name, type: a.type, appliesTo: a.appliesTo,
});

const readSrc = (
  filePath: string | undefined,
  content: string | undefined,
): { readonly src: string; readonly file: string } | undefined => {
  const inlineInput = mapOption((src: string) => ({ src, file: '<inline>' }))(fromNullable(content));
  if (isSome(inlineInput)) return inlineInput.value;
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
export const handleParseCnj = (
  filePath: string | undefined = undefined,
  content: string | undefined = undefined,
): ToolContent => {
  const input = readSrc(filePath, content);
  if (input === undefined) return toContent('Provide path or content');
  const parsed = parse(input.src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, input.file);
  if (isErr(doc)) return toContent(`Model error: ${describeCnjModelError(doc.error)}`);
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
export const handleReadCharter = (
  filePath: string | undefined = undefined,
  fields: ReadonlyArray<string> | undefined = undefined,
): ToolContent => {
  const input = readSrc(filePath, undefined);
  if (input === undefined) {
    return toContent(`File not found: ${getOrElseOption(() => '')(fromNullable(filePath))}`);
  }
  const parsed = parse(input.src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);
  const doc = toCnjModel(parsed.value, input.file);
  if (isErr(doc)) return toContent(`Model error: ${describeCnjModelError(doc.error)}`);
  const full = serializeCharter(doc.value.charter);
  const filtered = getOrElseOption<Readonly<Record<string, unknown>>>(() => full)(
    mapOption((fieldList: ReadonlyArray<string>) => (
      fieldList.length > 0
        ? Object.fromEntries(Object.entries(full).filter(([k]) => fieldList.includes(k)))
        : full
    ))(fromNullable(fields)),
  );
  return toContent(JSON.stringify(filtered, null, 2));
};

/**
 * Register parse and charter-read MCP tools.
 *
 * @param server - MCP server instance.
 * @returns No return value.
 */
export const registerParseTools = (server: McpServer): void => {
  server.registerTool('parse_cnj', {
    description: 'Parse a .cnj file into a structured document model',
    inputSchema: { path: z.string().optional(), content: z.string().optional() },
  }, ({ path, content }) => ({ content: [...handleParseCnj(path, content)] }));

  server.registerTool('read_charter', {
    description: 'Return a .cnj file\'s charter fields',
    inputSchema: { path: z.string(), fields: z.array(z.string()).optional() },
  }, ({ path, fields }) => ({ content: [...handleReadCharter(path, fields)] }));
};

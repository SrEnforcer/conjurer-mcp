/**
 * Retrieval tools for Conjurer MCP symbol and workspace queries.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  lookup, search, listAll, readSection, readGrimoire, parse, buildWorkspaceSnapshot, VALIDATION_RULE_DESCRIPTIONS, collectSymbolRefs,
  describeGrimoireError, describeWorkspaceError,
} from '@conjurer/core';
import type { SymbolIndex, SpecReader, EdnNode, EdnList } from '@conjurer/core';
import { isSome, isErr, fromNullable, getOrElseOption, mapOption, intoMap, sortWith, ordString } from '@tsfpp/prelude';
import { guarded } from './guard.js';

/**
 * Dependencies for retrieval handlers.
 */
export type RetrievalContext = {
  readonly index: SymbolIndex;
  readonly reader: SpecReader;
};

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

/**
 * Lookup one symbol from the loaded index.
 *
 * @param ctx - Retrieval context.
 * @param symbol - Fully-qualified symbol name.
 * @returns Tool text content payload.
 */
export const handleLookup = (ctx: RetrievalContext, symbol: string): ToolContent => {
  const rec = lookup(ctx.index, symbol);
  if (!isSome(rec)) return toContent(`Symbol not found: ${symbol}`);
  return toContent(JSON.stringify(rec.value, null, 2));
};

type SearchArgs = {
  readonly query: string;
  readonly grimoire: string | undefined;
  readonly limit: number | undefined;
};

/**
 * Search indexed symbols by query and optional filters.
 *
 * @param ctx - Retrieval context.
 * @param args - Search input arguments.
 * @returns Tool text content payload.
 */
export const handleSearch = (ctx: RetrievalContext, args: SearchArgs): ToolContent => {
  const opts = {
    query: args.query,
    ...(args.grimoire !== undefined ? { grimoire: args.grimoire } : {}),
    ...(args.limit !== undefined ? { limit: args.limit } : {}),
  };
  return toContent(JSON.stringify(search(ctx.index, opts), null, 2));
};

const handleSection = (ctx: RetrievalContext, grimoire: string, section: string): ToolContent => {
  const result = readSection(ctx.reader, grimoire, section);
  if (isErr(result)) return toContent(describeGrimoireError(result.error));
  return toContent(result.value);
};

const grimoireSymbolSection = (raw: string, symbol: string): string => {
  const needle = `### \`${symbol}\``;
  const start = raw.indexOf(needle);
  if (start === -1) return raw;
  const after = raw.slice(start + needle.length);
  const nextSection = after.search(/\n### /);
  return nextSection === -1 ? raw.slice(start) : raw.slice(start, start + needle.length + nextSection);
};

const handleExamples = (ctx: RetrievalContext, symbol: string, count: number | undefined = undefined): ToolContent => {
  const rec = lookup(ctx.index, symbol);
  if (!isSome(rec)) return toContent(`Symbol not found: ${symbol}`);
  const gResult = readGrimoire(ctx.reader, rec.value.grimoire);
  if (isErr(gResult)) return toContent(describeGrimoireError(gResult.error));
  const section = grimoireSymbolSection(gResult.value, symbol);
  const blocks = getOrElseOption<ReadonlyArray<string>>(() => [])(fromNullable(section.match(/```[a-z]*\n[\s\S]*?```/g)));
  const stripped = blocks.map((b) => b.replace(/^```[a-z]*\n/, '').replace(/```$/, ''));
  const limited = getOrElseOption<ReadonlyArray<string>>(() => stripped)(mapOption((c: number) => stripped.slice(0, c))(fromNullable(count)));
  return toContent(limited.join('\n\n'));
};

/**
 * List symbols globally or for a specific grimoire.
 *
 * @param ctx - Retrieval context.
 * @param grimoire - Optional grimoire name filter as an explicit union.
 * @returns Tool text content payload.
 */
export const handleList = (ctx: RetrievalContext, grimoire: string | undefined = undefined): ToolContent => {
  return toContent(JSON.stringify(listAll(ctx.index, grimoire), null, 2));
};

const visitNodeForCount = (node: EdnNode, isHead: boolean): ReadonlyArray<string> => {
  if (node.type === 'symbol') {
    return isHead || node.value.includes('/') ? [node.value] : [];
  }
  if (node.type === 'list') {
    return node.elements.flatMap((el, i) => visitNodeForCount(el, i === 0));
  }
  if (node.type === 'map') {
    return Array.from(node.entries.values()).flatMap((v) => visitNodeForCount(v, false));
  }
  return [];
};

const countSymbolRefs = (nodes: ReadonlyArray<EdnNode>): ReadonlyMap<string, number> => {
  const refs = nodes.flatMap((n) => visitNodeForCount(n, false));
  const emptyCounts: Readonly<Record<string, number>> = {};
  const countsBySymbol = refs.reduce((counts, sym) => {
    const current = getOrElseOption(() => 0)(fromNullable(counts[sym]));
    return { ...counts, [sym]: current + 1 };
  }, emptyCounts);
  return intoMap(Object.entries(countsBySymbol));
};

/**
 * Compute symbol-coverage statistics for one cnj file.
 *
 * @param ctx - Retrieval context.
 * @param filePath - Input file path.
 * @param grimoire - Optional grimoire filter as explicit union.
 * @returns Tool text content payload.
 */
export const handleCoverage = (
  ctx: RetrievalContext,
  filePath: string,
  grimoire: string | undefined = undefined,
): ToolContent => {
  if (!existsSync(filePath)) return toContent(`File not found: ${filePath}`);
  const src = readFileSync(filePath, 'utf8');
  const parsed = parse(src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);

  const refs = intoMap(collectSymbolRefs(parsed.value).map((symbol) => [symbol, true] as const));
  const allSymbols = Array.from(ctx.index.symbols.values());
  const filtered = grimoire !== undefined ? allSymbols.filter((s) => s.grimoire === grimoire) : allSymbols;
  const grimoireNames = sortWith(ordString)(Array.from(intoMap(filtered.map((s) => [s.grimoire, true] as const)).keys()));

  const byGrimoire = grimoireNames.map((g) => {
    const available = filtered.filter((s) => s.grimoire === g);
    const used = available.filter((s) => refs.has(s.symbol));
    const unused = available.filter((s) => !refs.has(s.symbol));
    return {
      grimoire: g,
      available: available.length,
      referenced: used.length,
      symbols_used: used.map((s) => s.symbol),
      symbols_unused: unused.map((s) => s.symbol),
    };
  });

  const total = filtered.length;
  const referenced = filtered.filter((s) => refs.has(s.symbol)).length;
  return toContent(JSON.stringify({
    total_in_index: total,
    referenced,
    coverage_pct: total > 0 ? Math.round((referenced / total) * 100) : 0,
    by_grimoire: byGrimoire,
    spec_available: ctx.index.symbols.size > 0,
  }, null, 2));
};


const nodeStr = (n: EdnNode): string => {
  if (n.type === 'string') return n.value;
  if (n.type === 'keyword') return n.value.substring(1);
  if (n.type === 'symbol') return n.value;
  return '';
};

const findFormNode = (nodes: ReadonlyArray<EdnNode>, name: string): EdnList | undefined => {
  const candidates = nodes.filter((node): node is EdnList => node.type === 'list' && node.elements.length >= 2);
  return candidates.find((node) => {
    const head = node.elements[0];
    const second = node.elements[1];
    return head !== undefined
      && second !== undefined
      && (nodeStr(second) === name || (head.type === 'symbol' && head.value === name));
  });
};

const formType = (node: EdnList): string => {
  const head = node.elements[0];
  return head !== undefined && head.type === 'symbol' ? head.value : 'unknown';
};

/**
 * Explain one named form by type, references, and applicable rules.
 *
 * @param ctx - Retrieval context.
 * @param filePath - Input cnj file path.
 * @param name - Form name.
 * @returns Tool text content payload.
 */
export const handleExplainForm = (ctx: RetrievalContext, filePath: string, name: string): ToolContent => {
  if (!existsSync(filePath)) return toContent(`File not found: ${filePath}`);
  const src = readFileSync(filePath, 'utf8');
  const parsed = parse(src);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);

  // Normalise tool-name style (underscores) to form-name style (hyphens) before searching.
  const normalizedName = name.replace(/_/g, '-');
  const formNode = findFormNode(parsed.value, normalizedName);
  if (formNode === undefined) return toContent(`Form not found: ${name}`);

  const type = formType(formNode);
  const rawRefs = collectSymbolRefs([formNode]);
  const symbolsReferenced = rawRefs.map((sym) => {
    const rec = lookup(ctx.index, sym);
    return isSome(rec)
      ? { symbol: sym, grimoire: rec.value.grimoire, synopsis: rec.value.synopsis, known: true }
      : { symbol: sym, grimoire: '', synopsis: '', known: false };
  });

  const validationRules = getOrElseOption<ReadonlyArray<string>>(() => [])(fromNullable(VALIDATION_RULE_DESCRIPTIONS[type]));

  return toContent(JSON.stringify({
    form_type: type,
    name: normalizedName,
    symbols_referenced: symbolsReferenced,
    validation_rules: validationRules,
    spec_available: ctx.index.symbols.size > 0,
  }, null, 2));
};

/**
 * Trace one symbol across the workspace graph rooted at filePath.
 *
 * @param ctx - Retrieval context.
 * @param symbol - Symbol to trace.
 * @param filePath - Entry cnj file path.
 * @returns Tool text content payload.
 */
export const handleTraceSymbol = (ctx: RetrievalContext, symbol: string, filePath: string): ToolContent => {
  const snapshotRes = buildWorkspaceSnapshot(resolvePath(filePath));
  if (isErr(snapshotRes)) return toContent(`Workspace error: ${describeWorkspaceError(snapshotRes.error)}`);
  const snapshot = snapshotRes.value;

  const knownSymbol = isSome(lookup(ctx.index, symbol));
  const filesWithReference = Array.from(snapshot.files.values())
    .flatMap((entry) => {
      const parsed = parse(entry.content);
      if (isErr(parsed)) return [];
      const count = getOrElseOption(() => 0)(fromNullable(countSymbolRefs(parsed.value).get(symbol)));
      return count > 0 ? [{ file: entry.path, reference_count: count }] : [];
    });

  return toContent(JSON.stringify({
    symbol,
    known_symbol: knownSymbol,
    total_files_scanned: snapshot.files.size,
    unreadable_files: snapshot.unreadableFiles,
    files_with_reference: filesWithReference,
    spec_available: ctx.index.symbols.size > 0,
    scope: {
      method: 'references_bfs' as const,
      entry: resolvePath(filePath),
      files_discovered: snapshot.files.size,
      note: 'files not reachable via :references are excluded',
    },
  }, null, 2));
};

/**
 * Register retrieval-oriented MCP tools.
 *
 * @param server - MCP server.
 * @param ctx - Retrieval context.
 * @returns No return value.
 */
export const registerRetrievalTools = (server: McpServer, ctx: RetrievalContext): void => {
  server.registerTool('lookup_symbol', {
    description: 'Return one construct\'s full record from the symbol index',
    inputSchema: { symbol: z.string(), include: z.array(z.string()).optional() },
  }, ({ symbol }) => ({ content: [...handleLookup(ctx, symbol)] }));

  server.registerTool('search_symbols', {
    description: 'Find candidate symbols by keyword across synopses',
    inputSchema: { query: z.string(), grimoire: z.string().optional(), limit: z.number().int().optional() },
  }, ({ query, grimoire, limit }) => ({ content: [...handleSearch(ctx, { query, grimoire, limit })] }));

  server.registerTool('get_grimoire_section', {
    description: 'Return one section of a grimoire',
    inputSchema: { grimoire: z.string(), section: z.string(), part: z.string().optional() },
  }, ({ grimoire, section }) => ({ content: [...handleSection(ctx, grimoire, section)] }));

  server.registerTool('get_examples', {
    description: 'Return only the code examples for a construct',
    inputSchema: { symbol: z.string(), count: z.number().int().optional() },
  }, ({ symbol, count }) => ({ content: [...handleExamples(ctx, symbol, count)] }));

  server.registerTool('list_grimoire', {
    description: 'Constructs and one-line synopses for a grimoire or all grimoires',
    inputSchema: { grimoire: z.string().optional() },
  }, ({ grimoire }) => ({ content: [...handleList(ctx, grimoire)] }));

  server.registerTool('check_symbol_coverage', {
    description: 'Report which Conjurer symbols a .cnj file references vs the full index — utilisation density and gap map',
    inputSchema: { path: z.string(), grimoire: z.string().optional() },
  }, ({ path, grimoire }) => ({ content: [...guarded(path, () => handleCoverage(ctx, path, grimoire))] }));

  server.registerTool('trace_symbol', {
    description: 'Return which .cnj files in a workspace reference a given symbol and how many times',
    inputSchema: { symbol: z.string(), file: z.string() },
  }, ({ symbol, file }) => ({ content: [...guarded(file, () => handleTraceSymbol(ctx, symbol, file))] }));

  server.registerTool('explain_form', {
    description: 'Return a rich contextual explanation of a named .cnj form: type, referenced symbols with synopses, and applicable validation rules',
    inputSchema: { file: z.string(), name: z.string() },
  }, ({ file, name }) => ({ content: [...guarded(file, () => handleExplainForm(ctx, file, name))] }));
};

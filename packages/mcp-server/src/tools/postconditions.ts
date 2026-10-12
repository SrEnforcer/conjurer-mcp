/**
 * Postcondition tool — check_postconditions: evaluate an `ensure`'s structural predicates
 * against a proposed artefact's values, deterministically, using the spec's prelude.
 *
 * This is the MCP layer that `ensure :verify-via [:mcp]` names (core.md · ensure). Predicates
 * outside the prelude are reported as semantic, never evaluated.
 */
import { readFileSync, existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parse, findEnsureSites, checkPredicate, fromJson, EMPTY_PRELUDE } from '@conjurer/core';
import type { SymbolIndex, EnsureSite, JsonValue, PredicateOutcome } from '@conjurer/core';
import { isErr, intoMap } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

/** Context shared with the other tool clusters: the index carries the prelude. */
export type PostconditionContext = {
  readonly index: SymbolIndex;
};

/** Where the ensure forms come from: inline EDN, or a `.cnj` file and optionally one form in it. */
export type PostconditionSource =
  | { readonly kind: 'edn'; readonly text: string }
  | { readonly kind: 'file'; readonly path: string; readonly form?: string };

const sourceText = (source: PostconditionSource): string | undefined => {
  if (source.kind === 'edn') return source.text;
  return existsSync(source.path) ? readFileSync(source.path, 'utf8') : undefined;
};

const selectSites = (sites: ReadonlyArray<EnsureSite>, source: PostconditionSource): ReadonlyArray<EnsureSite> =>
  source.kind === 'file' && source.form !== undefined
    ? sites.filter((site) => site.owner.endsWith(`:${source.form ?? ''}`))
    : sites;

// Narrow tool input (validated by zod only as a record) to JSON values.
const toJsonValue = (v: unknown): JsonValue => {
  if (v === null || typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(toJsonValue);
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJsonValue(x)]));
  return null;
};

const summarise = (outcomes: ReadonlyArray<PredicateOutcome>): Readonly<Record<string, number>> =>
  outcomes.reduce<Readonly<Record<string, number>>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});

/**
 * Check the structural postconditions of every selected `ensure` against supplied values.
 *
 * @param source - Inline EDN or a `.cnj` path (with an optional form name).
 * @param values - The proposed artefact's fields, by the free-variable names the predicates use.
 * @param index - Symbol index; its prelude decides what may be evaluated.
 * @returns Tool text content payload.
 */
export const handleCheckPostconditions = (
  source: PostconditionSource,
  values: { readonly [key: string]: unknown },
  index: SymbolIndex | undefined = undefined,
): ToolContent => {
  const text = sourceText(source);
  if (text === undefined) return toContent(`File not found: ${source.kind === 'file' ? source.path : ''}`);
  const parsed = parse(text);
  if (isErr(parsed)) return toContent(`Parse error: ${parsed.error.message}`);
  const prelude = index?.prelude ?? EMPTY_PRELUDE;
  const env = intoMap(Object.entries(values).map(([k, v]) => [k, fromJson(toJsonValue(v))] as const));
  const sites = selectSites(findEnsureSites(parsed.value), source);
  const results = sites.map((site) => {
    const outcomes = site.structural.map((predicate) => checkPredicate(predicate, env, prelude));
    return {
      owner: site.owner,
      line: site.line,
      verify_via: site.verifyVia,
      mcp_claimed: site.verifyVia.includes('mcp'),
      outcomes,
    };
  });
  const all = results.flatMap((r) => r.outcomes);
  return toContent(JSON.stringify({
    prelude_available: index?.prelude !== undefined,
    ensure_forms: results.length,
    holds: all.every((o) => o.status === 'pass'),
    summary: summarise(all),
    results,
  }, null, 2));
};

/**
 * Register check_postconditions.
 *
 * @param server - The MCP server.
 * @param ctx - Shared context with the symbol index.
 * @returns Nothing; the tool is registered on the server.
 */
export const registerPostconditionTools = (server: McpServer, ctx?: PostconditionContext): void => {
  server.registerTool('check_postconditions', {
    description:
      'Evaluate the :structural predicates of ensure forms against a proposed artefact\'s values, ' +
      'deterministically, using the spec prelude. Predicates outside the prelude are reported as semantic ' +
      '(enforced at :llm), never evaluated. Give either inline EDN or a .cnj file (optionally one form).',
    inputSchema: {
      edn: z.string().optional().describe('Inline EDN containing one or more ensure forms (or invocations with :within)'),
      file: z.string().optional().describe('Path to a .cnj file'),
      form: z.string().optional().describe('With file: the name of the top-level form whose ensure to check'),
      values: z.record(z.string(), z.unknown()).describe('Artefact fields by name; ":kw" strings are keywords, {unit, magnitude} is a quantity'),
    },
  }, ({ edn, file, form, values }) => {
    const source: PostconditionSource | undefined = edn !== undefined
      ? { kind: 'edn', text: edn }
      : file !== undefined ? { kind: 'file', path: file, ...(form !== undefined ? { form } : {}) } : undefined;
    const content = source === undefined
      ? toContent('Provide either edn or file')
      : handleCheckPostconditions(source, values, ctx?.index);
    return { content: [...content] };
  });
};

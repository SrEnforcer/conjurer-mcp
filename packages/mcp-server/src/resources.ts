/**
 * MCP resource registration for Conjurer grimoire documents.
 */
/* eslint-disable functional/prefer-readonly-type -- DEVIATION(2.2): MCP SDK callback contracts require mutable array/object response shapes. */
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readGrimoire, describeGrimoireError } from '@conjurer/core';
import type { SpecReader, SymbolIndex } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

/**
 * Resource registration dependencies.
 */
export type ResourceContext = {
  readonly reader: SpecReader;
  readonly index: SymbolIndex;
};

const toReadContent = (
  uri: URL,
  mimeType: string,
  text: string,
): { contents: Array<{ uri: string; mimeType: string; text: string }> } => ({
  contents: [{ uri: uri.toString(), mimeType, text }],
});

const listGrimoireResources = (ctx: ResourceContext): {
  resources: Array<{
    name: string;
    uri: string;
    description: string;
    mimeType: string;
  }>;
} => ({
  resources: Array.from(ctx.index.grimoires.values()).map((g) => ({
    name: g.name,
    uri: `conjurer://grimoire/${g.name}`,
    description: `The ${g.name} grimoire`,
    mimeType: 'text/markdown',
  })),
});

const readGrimoireResource = (
  ctx: ResourceContext,
  uri: URL,
  variables: Record<string, unknown>,
): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} => {
  const name = variables['name'];
  const grimName = Array.isArray(name) ? name[0] : name;
  if (typeof grimName !== 'string' || grimName.length === 0) {
    return toReadContent(uri, 'text/plain', 'Missing grimoire name in URI');
  }
  const result = readGrimoire(ctx.reader, grimName);
  return isErr(result)
    ? toReadContent(uri, 'text/plain', describeGrimoireError(result.error))
    : toReadContent(uri, 'text/markdown', result.value);
};

/**
 * Register markdown resources for each known Conjurer grimoire.
 *
 * @param server - MCP server instance.
 * @param ctx - Resource registration context.
 * @returns No return value.
 */
export const registerGrimoireResources = (server: McpServer, ctx: ResourceContext): void => {
  // DEVIATION(1.9): ResourceTemplate construction is an MCP SDK adapter boundary.
  // eslint-disable-next-line no-restricted-syntax
  const template = new ResourceTemplate(
    'conjurer://grimoire/{name}',
    {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- DEVIATION(3.1): SDK callback shape inferred from adapter type.
      list: () => listGrimoireResources(ctx),
    },
  );

  server.registerResource(
    'conjurer-grimoire',
    template,
    { description: 'A Conjurer grimoire — full markdown content of one spec file', mimeType: 'text/markdown' },
    (uri, variables) => readGrimoireResource(ctx, uri, variables),
  );
};

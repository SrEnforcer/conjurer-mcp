/**
 * MCP server bootstrap and tool/resource wiring.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolveSpecPath, buildIndex } from '@conjurer/core';
import type { SpecReader, SymbolIndex } from '@conjurer/core';
import { isSome, isOk, intoMap } from '@tsfpp/prelude';
import { log, logError } from './logging.js';
import { registerRetrievalTools } from './tools/retrieval.js';
import { registerParseTools } from './tools/parse.js';
import { registerValidateTools } from './tools/validate.js';
import { registerProjectTools } from './tools/project.js';
import { registerLensTools } from './tools/lenses.js';
import { registerDiffTools } from './tools/diff.js';
import { registerForesightTools } from './tools/foresight.js';
import { registerPostconditionTools } from './tools/postconditions.js';
import { registerGrimoireResources } from './resources.js';

const emptyIndex: SymbolIndex = { symbols: intoMap([]), grimoires: intoMap([]) };

const buildSpecContext = (): { readonly reader: SpecReader; readonly index: SymbolIndex } => {
  const pathOpt = resolveSpecPath(process.env);
  if (!isSome(pathOpt)) {
    log('warn', 'conjurer-spec not found; retrieval tools will return errors');
    return { reader: { specPath: '' }, index: emptyIndex };
  }
  const reader: SpecReader = { specPath: pathOpt.value };
  const indexResult = buildIndex(reader);
  if (!isOk(indexResult)) {
    logError('Failed to build symbol index', indexResult.error);
    return { reader, index: emptyIndex };
  }
  return { reader, index: indexResult.value };
};

/**
 * Start the MCP server on stdio transport.
 *
 * @returns A promise that resolves when server startup completes.
 */
export const main = async (): Promise<void> => {
  const { reader, index } = buildSpecContext();
  // DEVIATION(1.9): McpServer and StdioServerTransport are SDK adapter boundaries.
  // eslint-disable-next-line no-restricted-syntax
  const server = new McpServer({ name: 'conjurer-mcp', version: '0.1.1' }); // x-release-please-version
  registerGrimoireResources(server, { index, reader });
  registerRetrievalTools(server, { index, reader });
  registerParseTools(server);
  registerValidateTools(server, { index });
  registerProjectTools(server);
  registerLensTools(server);
  registerDiffTools(server);
  registerForesightTools(server);
  registerPostconditionTools(server, { index });
  // eslint-disable-next-line no-restricted-syntax
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((e: unknown) => {
  logError('Fatal error', e);
  process.exit(1);
});

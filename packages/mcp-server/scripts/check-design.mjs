// Run the built server over design/*.cnj through the MCP protocol and fail on
// anything a design file should never carry: an invalid file, a module or
// reference missing on disk, a topology or preflight gap, an orphaned hoist.
// Date-dependent findings (stale candidates) are left to lens_foresight_health.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(pkg, '../..');
const design = join(root, 'design');

// conjurer-mcp.recovered.cnj is left out: it records the prior codebase, and
// its :references point into that codebase rather than this repository.
const AUTHORED = ['conjurer-mcp', 'mcp-server', 'vscode-extension', 'conjurer-mcp.exhume'];
const WITH_MODULES = ['conjurer-mcp', 'mcp-server', 'vscode-extension'];

const client = new Client({ name: 'check-design', version: '0' });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [join(pkg, 'dist/server.js')],
  stderr: 'ignore',
}));

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  return JSON.parse(result.content.map((c) => c.text).join(''));
};

const failures = [];
const fail = (what, detail) => failures.push(`${what}\n${JSON.stringify(detail, null, 2)}`);
const cnj = (name) => join(design, `${name}.cnj`);

for (const name of AUTHORED) {
  const r = await call('validate_cnj', { path: cnj(name), mode: 'authored' });
  const errors = r.violations.filter((v) => v.severity === 'error');
  if (!r.valid || errors.length > 0) fail(`validate_cnj ${name}.cnj`, errors);
}

for (const name of WITH_MODULES) {
  const r = await call('lint_disk_consistency', { path: cnj(name), root });
  if (!r.consistent) fail(`lint_disk_consistency ${name}.cnj`, r);
}

const topology = await call('project_lint_topology', { workspace: design });
if (!topology.summary.ready) fail('project_lint_topology design/', topology.issues);

const preflight = await call('materialise_preflight', { folder: design });
if (!preflight.ready) fail('materialise_preflight design/', preflight);

const health = await call('lens_foresight_health', { file: cnj('conjurer-mcp') });
if (health.orphaned_hoists.length > 0) fail('lens_foresight_health orphaned hoists', health.orphaned_hoists);

await client.close();

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
console.log(`design/ checks passed (${AUTHORED.length} files validated)`);

/**
 * Verification script for GAPs 3, 4, 5, 6 and BUGs 1, 2.
 * Calls the compiled conjurer-mcp server functions directly.
 */
import { createRequire } from 'node:module';
import { some, none, isErr, isSome } from '/home/user1/projects/personal/conjurer-mcp/node_modules/@tsfpp/prelude/dist/index.js';

const serverPath = '/home/user1/projects/personal/conjurer-mcp/dist/index.js';
const workspacePath = '/home/user1/projects/personal/cnj-mcp';

// We need to use the MCP server via stdio. Instead, let's directly import services.
const wcsSvc = await import('/home/user1/projects/personal/conjurer-mcp/dist/src/services/workspace-context-service.js');
const matSvc = await import('/home/user1/projects/personal/conjurer-mcp/dist/src/services/materialise-service.js');

// Initialize workspace
const initRes = wcsSvc.initializeWorkspaceContext({ workspacePath: some(workspacePath) });
if (isErr(initRes)) {
  console.error('Failed to init workspace:', initRes.error);
  process.exit(1);
}

const snapshot = wcsSvc.getWorkspaceSnapshot();
if (isErr(snapshot)) {
  console.error('Failed to get snapshot:', snapshot.error);
  process.exit(1);
}

console.log('=== MATERIALISE PLAN VERIFICATION ===\n');
console.log(`Workspace: ${workspacePath}`);
console.log(`Files loaded: ${snapshot.value.files.size}\n`);

const results = [];

for (const [relPath, parsedFile] of snapshot.value.files) {
  for (const decl of parsedFile.targetDeclarations) {
    const formText = decl.form;
    const formName = isSome(decl.name) ? decl.name.value.replace(/^:/, '') : '(unnamed)';

    const planRes = matSvc.buildMaterialisePlan({
      selectedForm: formText,
      sourceFile: some(relPath),
      outputRoot: workspacePath,
      workspaceRoot: workspacePath,
    });

    if (isErr(planRes)) {
      results.push({ file: relPath, formName, error: planRes.error });
      continue;
    }

    const plan = planRes.value;
    results.push({
      file: relPath,
      formName,
      outputs: plan.outputs.map(o => ({ type: o.outputType, path: o.resolvedPath, derivation: o.pathDerivation })),
      dependencies: plan.dependencies,
      assetConstraints: plan.assetConstraintsApplied,
      warnings: plan.warnings,
    });
  }
}

// Print summary
for (const r of results) {
  console.log(`--- ${r.file}  :${r.formName} ---`);
  if (r.error) {
    console.log(`  ERROR: ${r.error}`);
  } else {
    console.log(`  dependencies (${r.dependencies.length}):`);
    for (const d of r.dependencies) {
      console.log(`    ${d.symbol} → ${d.sourceFile || '(not found)'} [${d.status}]`);
    }
    console.log(`  asset_constraints_applied (${r.assetConstraints.length}):`);
    for (const c of r.assetConstraints.slice(0, 4)) {
      console.log(`    ${c.slice(0, 90)}`);
    }
    if (r.assetConstraints.length > 4) console.log(`    ... (${r.assetConstraints.length - 4} more)`);
    console.log(`  outputs (${r.outputs.length}):`);
    for (const o of r.outputs.slice(0, 4)) {
      console.log(`    [${o.type}] ${o.path}`);
    }
    if (r.outputs.length > 4) console.log(`    ... (${r.outputs.length - 4} more)`);
    if (r.warnings.length > 0) console.log(`  warnings: ${r.warnings.join('; ')}`);
  }
  console.log();
}

// GAP checks
console.log('=== GAP CHECKS ===\n');

// GAP 3: deps present for :mcp-server and :vscode-extension
const mcpServerDeps = results.filter(r => r.formName === 'mcp-server' && r.dependencies?.length > 0);
console.log(`GAP 3 — :from dependency resolution:`);
console.log(`  Targets with dependencies: ${mcpServerDeps.length > 0 ? 'PASS' : 'FAIL — none found'}`);
for (const r of mcpServerDeps) {
  console.log(`  ${r.file}  :mcp-server  deps: ${r.dependencies.map(d => d.symbol + '(' + d.status + ')').join(', ')}`);
}

// GAP 4: asset constraints present
const withConstraints = results.filter(r => r.assetConstraints?.length > 0);
console.log(`\nGAP 4 — asset constraints applied:`);
console.log(`  Targets with constraints: ${withConstraints.length} (${withConstraints.length > 0 ? 'PASS' : 'FAIL'})`);

// GAP 5: module paths used
const withModulePaths = results.filter(r => r.outputs?.some(o => o.path.startsWith('packages/')));
console.log(`\nGAP 5 — module-based output paths:`);
console.log(`  Targets using module paths: ${withModulePaths.length} (${withModulePaths.length > 0 ? 'PASS' : 'FAIL'})`);

// GAP 6: no fallback warning for mcp-server in mcp-server.cnj
const mcpServerMcpServerCnj = results.find(r => r.file === 'design/mcp-server.cnj' && r.formName === 'mcp-server');
const gap6Pass = mcpServerMcpServerCnj && !mcpServerMcpServerCnj.warnings?.some(w => w.includes('No explicit output intent'));
console.log(`\nGAP 6 — no fallback warning for design/mcp-server.cnj :mcp-server:`);
console.log(`  ${gap6Pass ? 'PASS' : 'FAIL'}`);

// BUG 2: charter per-file (check via getFileCharterSummary)
console.log('\nBUG 2 — per-file charter summary:');
const files = ['design/conjurer-mcp.cnj', 'design/mcp-server.cnj', 'design/vscode-extension.cnj'];
for (const f of files) {
  const cs = wcsSvc.getFileCharterSummary(f);
  if (isSome(cs)) {
    console.log(`  ${f}: goals[0] = "${cs.value.goals[0]?.slice(0, 60)}..."`);
  } else {
    console.log(`  ${f}: no charter`);
  }
}

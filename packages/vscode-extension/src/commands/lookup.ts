import * as vscode from 'vscode';
import { lookup, search } from '@conjurer/core';
import type { SymbolRecord } from '@conjurer/core';
import { isSome } from '@tsfpp/prelude';
import type { CoreBridge } from '../core-bridge.js';

const formatSymbolHtml = (rec: SymbolRecord): string => {
  const sigLine = rec.signature !== undefined ? `<p><code>${rec.signature}</code></p>` : '';
  const paramsLine = rec.keyParams.length > 0
    ? `<p><em>Key params:</em> ${rec.keyParams.join(', ')}</p>` : '';
  return `<!DOCTYPE html><html><body>
    <h2>${rec.symbol}</h2><p><em>${rec.grimoire}</em></p>
    <p>${rec.synopsis}</p>${sigLine}${paramsLine}
  </body></html>`;
};

const showSymbolPanel = (sym: string, bridge: CoreBridge): void => {
  const rec = lookup(bridge.symbolIndex, sym);
  if (!isSome(rec)) {
    void vscode.window.showWarningMessage(`Symbol not found: ${sym}`);
    return;
  }
  const panel = vscode.window.createWebviewPanel('conjurerSymbol', `Conjurer: ${sym}`, vscode.ViewColumn.Beside, {});
  // DEVIATION(1.9): panel.webview.html is a mutable VS Code adapter property.
  // eslint-disable-next-line functional/immutable-data
  panel.webview.html = formatSymbolHtml(rec.value);
};

const doLookupCommand = async (bridge: CoreBridge): Promise<void> => {
  const sym = await vscode.window.showInputBox({ prompt: 'Conjurer symbol name (e.g. materialise)' });
  if (sym !== undefined && sym.trim().length > 0) showSymbolPanel(sym.trim(), bridge);
};

const doSearchCommand = async (bridge: CoreBridge): Promise<void> => {
  const q = await vscode.window.showInputBox({ prompt: 'Search query' });
  if (q === undefined || q.trim().length === 0) return;
  const results = search(bridge.symbolIndex, { query: q.trim() });
  const items = results.map((r) => ({ label: r.symbol, description: r.synopsis }));
  const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select symbol' });
  if (pick !== undefined) showSymbolPanel(pick.label, bridge);
};

export const registerLookupCommands = (bridge: CoreBridge, ctx: vscode.ExtensionContext): void => {
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    vscode.commands.registerCommand('conjurer.lookupSymbol', () => void doLookupCommand(bridge)),
    vscode.commands.registerCommand('conjurer.searchSymbols', () => void doSearchCommand(bridge)),
    vscode.commands.registerCommand('conjurer.showExamples', (sym: string) => showSymbolPanel(sym, bridge)),
  );
};

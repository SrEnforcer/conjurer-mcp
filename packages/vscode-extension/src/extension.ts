import * as vscode from 'vscode';
import { createCoreBridge } from './core-bridge.js';
import { createHoverProvider } from './providers/hover.js';
import { createCodeLensProvider } from './providers/codelens.js';
import { createFoldingProvider, foldHoistFormsOnOpen } from './providers/folding.js';
import { registerLookupCommands } from './commands/lookup.js';
import { registerValidateCommands } from './commands/validate.js';
import { registerMaterialiseFolderCommand } from './commands/materialise-folder.js';
import { registerRefineCommands } from './commands/refine.js';
import { registerForesightStatusBar } from './providers/status-bar.js';

const CNJ_SELECTOR: vscode.DocumentSelector = [
  { scheme: 'file', pattern: '**/*.cnj' },
  { scheme: 'file', pattern: '**/*.md' },
];

export const activate = (ctx: vscode.ExtensionContext): void => {
  const bridge = createCoreBridge();

  // Track which documents have had their f/hoist forms folded this session
  // so tab-switching does not re-collapse forms the user manually expanded.
  const foldedDocs = new Set<string>();
  const maybeFold = (editor: vscode.TextEditor | undefined): void => {
    if (editor === undefined) return;
    const uri = editor.document.uri.toString();
    if (foldedDocs.has(uri)) return;
    foldedDocs.add(uri);
    foldHoistFormsOnOpen(editor);
  };

  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    vscode.languages.registerHoverProvider(CNJ_SELECTOR, createHoverProvider(bridge.symbolIndex)),
    vscode.languages.registerCodeLensProvider(CNJ_SELECTOR, createCodeLensProvider(bridge.symbolIndex)),
    vscode.languages.registerFoldingRangeProvider(CNJ_SELECTOR, createFoldingProvider()),
    vscode.window.onDidChangeActiveTextEditor(maybeFold),
    vscode.commands.registerCommand('conjurer.showCandidateDetails', (id: string, score: number, status: string) => {
      void vscode.window.showInformationMessage(`${id}: score ${score} (${status})`);
    }),
  );
  maybeFold(vscode.window.activeTextEditor);
  registerLookupCommands(bridge, ctx);
  registerValidateCommands(ctx);
  registerMaterialiseFolderCommand(ctx);
  registerRefineCommands(ctx);
  registerForesightStatusBar(ctx);
};

export const deactivate = (): void => { /* VS Code disposes subscriptions automatically */ };

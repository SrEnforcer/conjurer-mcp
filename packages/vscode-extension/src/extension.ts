import * as vscode from 'vscode';
import { mkCoreBridge } from './core-bridge.js';
import { mkHoverProvider, buildHoverContent } from './providers/hover.js';
import { mkCodeLensProvider } from './providers/codelens.js';
import { mkFoldingProvider, foldHoistFormsOnOpen } from './providers/folding.js';
import { registerLookupCommands } from './commands/lookup.js';
import { registerValidateCommands } from './commands/validate.js';
import { registerMaterialiseFolderCommand } from './commands/materialise-folder.js';
import { registerRefineCommands } from './commands/refine.js';
import { registerReassessCommands } from './commands/reassess.js';
import { registerForesightStatusBar } from './providers/status-bar.js';
import { registerCandidateGutter } from './providers/candidate-gutter.js';
import { registerDiskLintDecorations } from './providers/disk-lint.js';

const CNJ_SELECTOR: vscode.DocumentSelector = [
  { language: 'conjurer' },
  { scheme: 'file', pattern: '**/*.cnj' },
  { scheme: 'file', pattern: '**/*.md' },
];

const SYMBOL_PATTERN = /[a-zA-Z][a-zA-Z0-9_\-/]*/;

const describeActiveSymbol = (
  bridge: ReturnType<typeof mkCoreBridge>,
  out: vscode.OutputChannel,
): void => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;
  const range = editor.document.getWordRangeAtPosition(editor.selection.active, SYMBOL_PATTERN);
  if (range === undefined) return;
  const word = editor.document.getText(range).replace(/^:/, '');
  const content = buildHoverContent(bridge.symbolIndex, word);
  if (content === undefined) {
    void vscode.window.showInformationMessage(`"${word}" is not in the Conjurer spec.`);
    return;
  }
  out.appendLine('');
  out.appendLine(content);
  out.show(true);
};

const mkFoldTracker = (): ((editor: vscode.TextEditor | undefined) => void) => {
  // DEVIATION(1.9): session-local Set state is a pragmatic VS Code adapter cache.
  // eslint-disable-next-line no-restricted-syntax
  const foldedDocs = new Set<string>();

  return (editor: vscode.TextEditor | undefined): void => {
    if (editor === undefined) return;
    const uri = editor.document.uri.toString();
    if (foldedDocs.has(uri)) return;
    // DEVIATION(2.3): the fold cache is adapter-local mutable session state.
    // eslint-disable-next-line functional/immutable-data
    foldedDocs.add(uri);
    foldHoistFormsOnOpen(editor);
  };
};

const registerProviders = (
  args: {
    readonly bridge: ReturnType<typeof mkCoreBridge>;
    readonly ctx: vscode.ExtensionContext;
    readonly maybeFold: (editor: vscode.TextEditor | undefined) => void;
    readonly out: vscode.OutputChannel;
  },
): void => {
  const { bridge, ctx, maybeFold, out } = args;
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    vscode.languages.registerHoverProvider(CNJ_SELECTOR, mkHoverProvider(bridge.symbolIndex)),
    vscode.languages.registerCodeLensProvider(CNJ_SELECTOR, mkCodeLensProvider(bridge.symbolIndex)),
    vscode.languages.registerFoldingRangeProvider(CNJ_SELECTOR, mkFoldingProvider()),
    vscode.window.onDidChangeActiveTextEditor(maybeFold),
    vscode.commands.registerCommand('conjurer.showCandidateDetails', (id: string, score: number, status: string) => {
      void vscode.window.showInformationMessage(`${id}: score ${score} (${status})`);
    }),
    vscode.commands.registerCommand('conjurer.describeSymbol', () => describeActiveSymbol(bridge, out)),
  );
};

export const activate = (ctx: vscode.ExtensionContext): void => {
  const out = vscode.window.createOutputChannel('Conjurer');
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(out);
  const bridge = mkCoreBridge(out);
  const maybeFold = mkFoldTracker();
  registerProviders({ bridge, ctx, maybeFold, out });
  maybeFold(vscode.window.activeTextEditor);
  registerLookupCommands(bridge, ctx);
  registerValidateCommands(ctx);
  registerMaterialiseFolderCommand(ctx);
  registerRefineCommands(ctx);
  registerReassessCommands(ctx);
  registerForesightStatusBar(ctx);
  registerCandidateGutter(ctx);
  registerDiskLintDecorations(ctx);
};

export const deactivate = (): void => { /* VS Code disposes subscriptions automatically */ };

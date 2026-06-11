/* eslint-disable */
// Minimal vscode stub for unit testing. NOT production code.

export class Hover { constructor(readonly contents: unknown, readonly range?: unknown) {} }
export class MarkdownString { constructor(readonly value: string) {} }
export class Range { constructor(readonly sl: number, readonly sc: number, readonly el: number, readonly ec: number) {} }
export class Position { constructor(readonly line: number, readonly character: number) {} }
export class CodeLens { constructor(readonly range: unknown, readonly command?: unknown) {} }
export class FoldingRange { constructor(readonly start: number, readonly end: number, readonly kind?: number) {} }
export class Diagnostic {
  public source?: string;
  constructor(readonly range: unknown, readonly message: string, readonly severity: number) {}
}
export class Uri { static parse(s: string) { return { fsPath: s }; } }

export const FoldingRangeKind = { Comment: 1, Imports: 2, Region: 3 } as const;

export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 } as const;
export const ViewColumn = { Beside: 2 } as const;

export const window = {
  createWebviewPanel: () => ({ webview: { html: '' } }),
  createOutputChannel: () => ({ clear: () => {}, appendLine: () => {}, show: () => {}, dispose: () => {} }),
  showWarningMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  showInformationMessage: () => Promise.resolve(undefined),
  showInputBox: () => Promise.resolve(undefined),
  showQuickPick: () => Promise.resolve(undefined),
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: (_handler: unknown) => ({ dispose: () => {} }),
};

export const languages = {
  createDiagnosticCollection: () => ({ set: () => {}, dispose: () => {}, clear: () => {} }),
  registerHoverProvider: () => ({ dispose: () => {} }),
  registerCodeLensProvider: () => ({ dispose: () => {} }),
  registerFoldingRangeProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: (_cmd: string, _handler: unknown) => ({ dispose: () => {} }),
  executeCommand: (_cmd: string, ..._args: unknown[]) => Promise.resolve(undefined),
};

export const workspace = {
  workspaceFolders: undefined,
  onDidSaveTextDocument: (_handler: unknown) => ({ dispose: () => {} }),
};

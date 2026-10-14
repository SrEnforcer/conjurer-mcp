import * as vscode from 'vscode';
import { lookup } from '@conjurer/core';
import type { SymbolIndex, SymbolRecord } from '@conjurer/core';
import { isSome } from '@tsfpp/prelude';

const SYMBOL_PATTERN = /[a-zA-Z][a-zA-Z0-9_\-/]*/;

const formatHover = (rec: SymbolRecord): string => {
  const lines: ReadonlyArray<string> = [
    `**${rec.symbol}** — *${rec.grimoire}*`,
    '',
    rec.synopsis,
    ...(rec.signature !== undefined ? ['', `\`${rec.signature}\``] : []),
    ...(rec.keyParams.length > 0 ? ['', `Key params: ${rec.keyParams.join(', ')}`] : []),
  ];
  return lines.join('\n');
};

export const buildHoverContent = (index: SymbolIndex, symbolName: string): string | undefined => {
  const rec = lookup(index, symbolName);
  if (!isSome(rec)) return undefined;
  return formatHover(rec.value);
};

export type ConjurerHoverProvider = vscode.HoverProvider;

export const mkHoverProvider = (index: SymbolIndex): ConjurerHoverProvider => ({
  provideHover: (document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> => {
    const range = document.getWordRangeAtPosition(position, SYMBOL_PATTERN);
    if (range === undefined) return undefined;
    const word = document.getText(range);
    const content = buildHoverContent(index, word);
    if (content === undefined) return undefined;
    // DEVIATION(1.9): vscode.MarkdownString and vscode.Hover are VS Code adapter types.
    // eslint-disable-next-line no-restricted-syntax
    const md = new vscode.MarkdownString(content);
    // eslint-disable-next-line no-restricted-syntax
    return new vscode.Hover(md);
  },
});

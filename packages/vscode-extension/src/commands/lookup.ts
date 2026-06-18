import * as vscode from 'vscode';
import { lookup, search, readGrimoire } from '@conjurer/core';
import type { SymbolRecord } from '@conjurer/core';
import { isSome, isErr } from '@tsfpp/prelude';
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

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const EXAMPLES_CSS = `
  body { background:#1e1e1e; color:#d4d4d4; font-family:'Courier New',monospace; padding:16px; margin:0; }
  h2   { color:#9cdcfe; margin:0 0 2px; }
  .grim { color:#6a9955; font-style:italic; margin:0 0 16px; font-size:13px; }
  pre  { background:#252526; border:1px solid #3c3c3c; border-radius:4px;
         padding:12px 16px; overflow-x:auto; margin:0 0 16px; }
  code { font-size:13px; line-height:1.5; }
  .cmt  { color:#6a9955; }
  .str  { color:#ce9178; }
  .kw   { color:#9cdcfe; }
  .fn   { color:#dcdcaa; }
  .punc { color:#808080; }
  .none { color:#d4d4d4; }
`;

type TokenState = {
  readonly buffer: string;
  readonly output: ReadonlyArray<string>;
};

const STRING_RE = /^"([^"\\]|\\.)*"?/;
const KEYWORD_RE = /^:[a-zA-Z_\-][a-zA-Z0-9_\-\/\.]*/;
const FN_RE = /^[^\s()\[\]{},";]+/;

const flushBuffer = (state: TokenState): TokenState =>
  state.buffer.length === 0
    ? state
    : { buffer: '', output: [...state.output, escapeHtml(state.buffer)] };

const span = (className: string, content: string): string =>
  `<span class="${className}">${escapeHtml(content)}</span>`;

const takePrefixMatch = (regex: RegExp, input: string): string | undefined => regex.exec(input)?.[0];

const appendToken = (state: TokenState, token: string): TokenState => ({
  buffer: '',
  output: [...flushBuffer(state).output, token],
});

const takeComment = (input: string): string => {
  const newlineIndex = input.indexOf('\n');
  return newlineIndex === -1 ? input : input.slice(0, newlineIndex);
};

const tokenizeFrom = (code: string, index: number, state: TokenState): TokenState => {
  const remaining = code.slice(index);
  const ch = remaining[0];
  if (ch === undefined) return flushBuffer(state);
  if (ch === ';') {
    const comment = takeComment(remaining);
    return tokenizeFrom(code, index + comment.length, appendToken(state, span('cmt', comment)));
  }
  if (ch === '"') {
    const stringToken = takePrefixMatch(STRING_RE, remaining) ?? '"';
    return tokenizeFrom(code, index + stringToken.length, appendToken(state, span('str', stringToken)));
  }
  if (ch === ':') {
    const keywordToken = takePrefixMatch(KEYWORD_RE, remaining);
    return keywordToken === undefined
      ? tokenizeFrom(code, index + 1, { buffer: state.buffer + ch, output: state.output })
      : tokenizeFrom(code, index + keywordToken.length, appendToken(state, span('kw', keywordToken)));
  }
  if (ch === '(') {
    const fnToken = takePrefixMatch(FN_RE, remaining.slice(1));
    const withParen = appendToken(state, '<span class="punc">(</span>');
    return fnToken === undefined
      ? tokenizeFrom(code, index + 1, withParen)
      : tokenizeFrom(code, index + 1 + fnToken.length, {
          buffer: '',
          output: [...withParen.output, span('fn', fnToken)],
        });
  }
  if (')[]{}'.includes(ch)) {
    return tokenizeFrom(code, index + 1, appendToken(state, span('punc', ch)));
  }
  return tokenizeFrom(code, index + 1, { buffer: state.buffer + ch, output: state.output });
};

const tokenizeClojure = (code: string): string => {
  return tokenizeFrom(code, 0, { buffer: '', output: [] }).output.join('');
};

const formatExamplesHtml = (rec: SymbolRecord, blocks: ReadonlyArray<string>): string => {
  const blocksHtml = blocks.length === 0
    ? '<p><em>No examples found for this symbol.</em></p>'
    : blocks.map((b) => `<pre><code>${tokenizeClojure(b)}</code></pre>`).join('\n');
  return `<!DOCTYPE html><html><head><style>${EXAMPLES_CSS}</style></head><body>
    <h2>${escapeHtml(rec.symbol)}</h2><p class="grim">${escapeHtml(rec.grimoire)}</p>
    ${blocksHtml}
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

const symbolSection = (grimoire: string, symbol: string): string => {
  const needle = `### \`${symbol}\``;
  const start = grimoire.indexOf(needle);
  if (start === -1) return grimoire;
  const after = grimoire.slice(start + needle.length);
  const nextSection = after.search(/\n### /);
  return nextSection === -1 ? grimoire.slice(start) : grimoire.slice(start, start + needle.length + nextSection);
};

const showExamplesPanel = (sym: string, bridge: CoreBridge): void => {
  const rec = lookup(bridge.symbolIndex, sym);
  if (!isSome(rec)) {
    void vscode.window.showWarningMessage(`Symbol not found: ${sym}`);
    return;
  }
  const gResult = readGrimoire(bridge.specReader, rec.value.grimoire);
  const raw = isErr(gResult) ? '' : gResult.value;
  const section = symbolSection(raw, rec.value.symbol);
  const blocks: ReadonlyArray<string> = [...section.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
  const panel = vscode.window.createWebviewPanel('conjurerExamples', `Conjurer: ${sym} examples`, vscode.ViewColumn.Beside, {});
  // DEVIATION(1.9): panel.webview.html is a mutable VS Code adapter property.
  // eslint-disable-next-line functional/immutable-data
  panel.webview.html = formatExamplesHtml(rec.value, blocks);
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
    vscode.commands.registerCommand('conjurer.showExamples', (sym: string) => showExamplesPanel(sym, bridge)),
  );
};

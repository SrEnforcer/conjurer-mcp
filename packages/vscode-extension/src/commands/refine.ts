import * as vscode from 'vscode';
import { parse, toCnjModel } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';
import {
  extractFormContent, buildRefinePrompt, buildResolveOpenPrompt,
  buildCritiquePrompt, buildArguePrompt, buildRefreshGoalsPrompt,
} from './refine-prompts.js';

// ── VS Code adapter ───────────────────────────────────────────────────────

const openInChat = async (prompt: string): Promise<void> => {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt });
  } catch {
    await vscode.env.clipboard.writeText(prompt);
    void vscode.window.showInformationMessage(
      'Prompt copied to clipboard — paste it into your AI chat (Ctrl+V / Cmd+V).',
    );
  }
};

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

const doRefineForm = async (formType: string, formName: string, startLine: number): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;
  const lines = getLines(editor.document);
  const content = extractFormContent(lines, startLine);
  const prompt = buildRefinePrompt({
    filePath: editor.document.fileName,
    formContent: content,
    formName,
    formType,
  });
  await openInChat(prompt);
};

const doResolveOpen = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || !editor.document.fileName.endsWith('.cnj')) {
    void vscode.window.showInformationMessage('Open a .cnj document to resolve open questions.');
    return;
  }
  const src = editor.document.getText();
  const parsed = parse(src);
  if (isErr(parsed)) {
    void vscode.window.showErrorMessage(`Parse error: ${parsed.error.message}`);
    return;
  }
  const doc = toCnjModel(parsed.value, editor.document.fileName);
  if (isErr(doc)) {
    void vscode.window.showErrorMessage(`Model error: ${doc.error}`);
    return;
  }
  const { open } = doc.value.charter;
  if (open.length === 0) {
    void vscode.window.showInformationMessage('No open questions found in charter.');
    return;
  }
  // Use the raw charter form as context so the LLM sees decisions verbatim.
  const lines = getLines(editor.document);
  const charterLine = lines.findIndex((l) => /^\s*\(charter\s/.test(l));
  const charterContent = charterLine >= 0 ? extractFormContent(lines, charterLine) : src.slice(0, 2000);
  const prompt = buildResolveOpenPrompt(open, charterContent, editor.document.fileName);
  await openInChat(prompt);
};

const doCritiqueCandidate = async (candidateId: string, startLine: number): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;
  const content = extractFormContent(getLines(editor.document), startLine);
  const prompt = buildCritiquePrompt(candidateId, content, editor.document.fileName);
  await openInChat(prompt);
};

const doArgueCandidate = async (candidateId: string, startLine: number): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;
  const content = extractFormContent(getLines(editor.document), startLine);
  const prompt = buildArguePrompt(candidateId, content, editor.document.fileName);
  await openInChat(prompt);
};

const doRefreshGoals = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || !editor.document.fileName.endsWith('.cnj')) {
    void vscode.window.showInformationMessage('Open a .cnj document to refresh goals.');
    return;
  }
  const src = editor.document.getText();
  const parsed = parse(src);
  if (isErr(parsed)) {
    void vscode.window.showErrorMessage(`Parse error: ${parsed.error.message}`);
    return;
  }
  const doc = toCnjModel(parsed.value, editor.document.fileName);
  if (isErr(doc)) {
    void vscode.window.showErrorMessage(`Model error: ${doc.error}`);
    return;
  }
  const { goals } = doc.value.charter;
  const lines = getLines(editor.document);
  const charterLine = lines.findIndex((l) => /^\s*\(charter\s/.test(l));
  const charterContent = charterLine >= 0 ? extractFormContent(lines, charterLine) : src.slice(0, 3000);
  const prompt = buildRefreshGoalsPrompt({
    candidates: doc.value.candidates,
    charterContent,
    filePath: editor.document.fileName,
    goals,
  });
  await openInChat(prompt);
};

export const registerRefineCommands = (ctx: vscode.ExtensionContext): void => {
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      'conjurer.refineForm',
      (formType: string, formName: string, startLine: number) =>
        void doRefineForm(formType, formName, startLine),
    ),
    vscode.commands.registerCommand(
      'conjurer.resolveOpenQuestions',
      () => void doResolveOpen(),
    ),
    vscode.commands.registerCommand(
      'conjurer.critiqueCandidate',
      (candidateId: string, startLine: number) => void doCritiqueCandidate(candidateId, startLine),
    ),
    vscode.commands.registerCommand(
      'conjurer.argueCandidate',
      (candidateId: string, startLine: number) => void doArgueCandidate(candidateId, startLine),
    ),
    vscode.commands.registerCommand('conjurer.refreshGoals', () => void doRefreshGoals()),
  );
};

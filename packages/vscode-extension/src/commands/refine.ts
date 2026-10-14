import * as vscode from 'vscode';
import { parse, toCnjModel, describeCnjModelError, todayISO } from '@conjurer/core';
import type { CnjDocument } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';
import {
  extractFormContent, buildRefinePrompt, buildResolveOpenPrompt,
  buildCritiquePrompt, buildArguePrompt, buildRefreshGoalsPrompt,
} from './refine-prompts.js';
import { buildDecidePrompt } from './decide-prompt.js';
import { openInChat } from './chat-handoff.js';

// ── VS Code adapter ───────────────────────────────────────────────────────

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

const CHARTER_LINE = /^\s*\(charter\s/;

/** Parse the active .cnj into its model, telling the practitioner why when it cannot. */
const loadModel = (editor: vscode.TextEditor): CnjDocument | undefined => {
  const parsed = parse(editor.document.getText());
  if (isErr(parsed)) {
    void vscode.window.showErrorMessage(`Parse error: ${parsed.error.message}`);
    return undefined;
  }
  const doc = toCnjModel(parsed.value, editor.document.fileName);
  if (isErr(doc)) {
    void vscode.window.showErrorMessage(`Model error: ${describeCnjModelError(doc.error)}`);
    return undefined;
  }
  return doc.value;
};

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
  const model = loadModel(editor);
  if (model === undefined) return;
  const src = editor.document.getText();
  const { open } = model.charter;
  if (open.length === 0) {
    void vscode.window.showInformationMessage('No open questions found in charter.');
    return;
  }
  // Use the raw charter form as context so the LLM sees decisions verbatim.
  const lines = getLines(editor.document);
  const charterLine = lines.findIndex((l) => CHARTER_LINE.test(l));
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

const doDecideCandidate = async (candidateId: string, startLine: number): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) return;
  const model = loadModel(editor);
  const candidate = model?.candidates.find((c) => c.id === candidateId);
  if (model === undefined || candidate === undefined) return;
  const lines = getLines(editor.document);
  const charterLine = lines.findIndex((l) => CHARTER_LINE.test(l));
  const prompt = buildDecidePrompt({
    candidate,
    candidates: model.candidates,
    charterContent: charterLine >= 0 ? extractFormContent(lines, charterLine) : '',
    filePath: editor.document.fileName,
    formContent: extractFormContent(lines, startLine),
    goals: model.charter.goals,
    today: todayISO(),
  });
  await openInChat(prompt);
};

const doRefreshGoals = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || !editor.document.fileName.endsWith('.cnj')) {
    void vscode.window.showInformationMessage('Open a .cnj document to refresh goals.');
    return;
  }
  const model = loadModel(editor);
  if (model === undefined) return;
  const src = editor.document.getText();
  const { goals } = model.charter;
  const lines = getLines(editor.document);
  const charterLine = lines.findIndex((l) => CHARTER_LINE.test(l));
  const charterContent = charterLine >= 0 ? extractFormContent(lines, charterLine) : src.slice(0, 3000);
  const prompt = buildRefreshGoalsPrompt({
    candidates: model.candidates,
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
    vscode.commands.registerCommand(
      'conjurer.decideCandidate',
      (candidateId: string, startLine: number) => void doDecideCandidate(candidateId, startLine),
    ),
    vscode.commands.registerCommand('conjurer.refreshGoals', () => void doRefreshGoals()),
  );
};

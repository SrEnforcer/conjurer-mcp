import * as vscode from 'vscode';
import { parse, toCnjModel, describeCnjModelError, validateCnj } from '@conjurer/core';
import type { ValidationMode, Violation } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

export type DiagnosticInfo = {
  readonly message: string;
  readonly severity: 'error' | 'warning';
  readonly line: number;
};

export type OpenQuestionsResult =
  | { readonly questions: ReadonlyArray<string> }
  | { readonly error: string };

export type ValidationSummary = {
  readonly errors: number;
  readonly warnings: number;
  readonly total: number;
};

type ValidationReport = {
  readonly fileName: string;
  readonly summary: ValidationSummary;
  readonly diagnostics: ReadonlyArray<DiagnosticInfo>;
};

type ValidationOutcome =
  | { readonly _tag: 'ok'; readonly summary: ValidationSummary; readonly diagnostics: ReadonlyArray<DiagnosticInfo> }
  | { readonly _tag: 'error'; readonly message: string };

export const mapViolationToDiagnostic = (v: Violation): DiagnosticInfo => ({
  message: `[${v.rule}] ${v.message}`,
  severity: v.severity,
  line: 0,
});

const severityOf = (sev: 'error' | 'warning'): vscode.DiagnosticSeverity =>
  sev === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;

const toDiagnostic = (info: DiagnosticInfo): vscode.Diagnostic => {
  // DEVIATION(1.9): vscode.Range and vscode.Diagnostic are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(info.line, 0, info.line, 0);
  // eslint-disable-next-line no-restricted-syntax
  const d = new vscode.Diagnostic(range, info.message, severityOf(info.severity));
  // eslint-disable-next-line functional/immutable-data
  d.source = 'conjurer';
  return d;
};

const mkParseErrDiagnostic = (msg: string): vscode.Diagnostic => {
  // DEVIATION(1.9): vscode.Range and vscode.Diagnostic are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(0, 0, 0, 0);
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error);
};

export const summarizeViolations = (violations: ReadonlyArray<Violation>): ValidationSummary => ({
  errors: violations.filter((v) => v.severity === 'error').length,
  warnings: violations.filter((v) => v.severity === 'warning').length,
  total: violations.length,
});

const writeValidationReport = (channel: vscode.OutputChannel, report: ValidationReport): void => {
  channel.clear();
  channel.appendLine(`Validation result for ${report.fileName}`);
  channel.appendLine(
    `Errors: ${report.summary.errors}  Warnings: ${report.summary.warnings}  Total: ${report.summary.total}`,
  );
  if (report.diagnostics.length > 0) {
    channel.appendLine('');
    report.diagnostics.forEach((d, i) => {
      channel.appendLine(`${i + 1}. ${d.severity.toUpperCase()} ${d.message}`);
    });
  }
  channel.show(true);
};

const reportValidationError = (
  channel: vscode.OutputChannel,
  fileName: string,
  message: string,
): void => {
  channel.clear();
  channel.appendLine(`Validation failed for ${fileName}`);
  channel.appendLine(message);
  channel.show(true);
  void vscode.window.showErrorMessage(message);
};

const reportValidationSummary = (
  channel: vscode.OutputChannel,
  report: ValidationReport,
): void => {
  writeValidationReport(channel, report);
  if (report.summary.total === 0) {
    void vscode.window.showInformationMessage('Validation passed: no issues found.');
    return;
  }
  void vscode.window.showWarningMessage(
    `Validation found ${report.summary.total} issue(s): ${report.summary.errors} error(s), ${report.summary.warnings} warning(s).`,
  );
};

const runValidateCommand = (
  collection: vscode.DiagnosticCollection,
  validationChannel: vscode.OutputChannel,
): void => {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || !editor.document.fileName.endsWith('.cnj')) {
    void vscode.window.showInformationMessage('Open a .cnj document to validate.');
    return;
  }
  const outcome = validateDocument(editor.document, collection, 'authored');
  if (outcome._tag === 'error') {
    reportValidationError(validationChannel, editor.document.fileName, outcome.message);
    return;
  }
  reportValidationSummary(validationChannel, {
    fileName: editor.document.fileName,
    summary: outcome.summary,
    diagnostics: outcome.diagnostics,
  });
};

const validateDocument = (
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  mode: ValidationMode,
): ValidationOutcome => {
  const src = document.getText();
  const parsed = parse(src);
  if (isErr(parsed)) {
    const message = `Parse error: ${parsed.error.message}`;
    collection.set(document.uri, [mkParseErrDiagnostic(message)]);
    return { _tag: 'error', message };
  }
  const doc = toCnjModel(parsed.value, document.fileName);
  if (isErr(doc)) {
    const message = `Model error: ${describeCnjModelError(doc.error)}`;
    collection.set(document.uri, [mkParseErrDiagnostic(message)]);
    return { _tag: 'error', message };
  }
  const report = validateCnj(doc.value, mode);
  const summary = summarizeViolations(report.violations);
  const diagnostics = report.violations.map(mapViolationToDiagnostic);
  collection.set(document.uri, diagnostics.map(toDiagnostic));
  return { _tag: 'ok', summary, diagnostics };
};

export const extractOpenQuestions = (source: string, fileName: string): OpenQuestionsResult => {
  const parsed = parse(source);
  if (isErr(parsed)) return { error: `Parse error: ${parsed.error.message}` };
  const doc = toCnjModel(parsed.value, fileName);
  if (isErr(doc)) return { error: `Model error: ${describeCnjModelError(doc.error)}` };
  return { questions: doc.value.charter.open };
};

export const registerValidateCommands = (ctx: vscode.ExtensionContext): void => {
  const collection = vscode.languages.createDiagnosticCollection('conjurer');
  const openQuestionsChannel = vscode.window.createOutputChannel('Conjurer Open Questions');
  const validationChannel = vscode.window.createOutputChannel('Conjurer Validation');
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    collection,
    openQuestionsChannel,
    validationChannel,
    vscode.commands.registerCommand('conjurer.validateCnj', () => runValidateCommand(collection, validationChannel)),
    vscode.commands.registerCommand('conjurer.showOpen', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined || !editor.document.fileName.endsWith('.cnj')) {
        void vscode.window.showInformationMessage('Open a .cnj document to view open questions.');
        return;
      }
      const result = extractOpenQuestions(editor.document.getText(), editor.document.fileName);
      if ('error' in result) {
        void vscode.window.showErrorMessage(result.error);
        return;
      }
      if (result.questions.length === 0) {
        void vscode.window.showInformationMessage('No open questions found in charter.');
        return;
      }
      openQuestionsChannel.clear();
      openQuestionsChannel.appendLine(`Open questions in ${editor.document.fileName}:`);
      result.questions.forEach((question, i) => {
        openQuestionsChannel.appendLine(`${i + 1}. ${question}`);
      });
      openQuestionsChannel.show(true);
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.fileName.endsWith('.cnj')) validateDocument(doc, collection, 'authored');
    }),
  );
};

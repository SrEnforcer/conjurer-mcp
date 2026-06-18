import * as vscode from 'vscode';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse, toCnjModel } from '@conjurer/core';
import type { CnjTarget } from '@conjurer/core';
import { isErr, intoMap } from '@tsfpp/prelude';

const TARGET_FORM_RE = /^\(target\s+:([a-zA-Z][a-zA-Z0-9_-]*)/;

type TargetLine = { readonly name: string; readonly line: number };

const findTargetLines = (document: vscode.TextDocument): ReadonlyArray<TargetLine> =>
  Array.from({ length: document.lineCount }, (_, line) => ({
    line,
    text: document.lineAt(line).text,
  })).flatMap(({ line, text }) => {
    const match = TARGET_FORM_RE.exec(text);
    return match !== null && (match[1]?.length ?? 0) > 0
      ? [{ name: match[1] ?? '', line }]
      : [];
  });

const moduleExists = (mod: string, base: string): boolean => {
  const roots = [base, resolve(base, '..'), resolve(base, '../..'), resolve(base, '../../..')];
  return roots.some((r) => existsSync(resolve(r, mod)));
};

const getModuleNames = (target: CnjTarget): ReadonlyArray<string> =>
  target.modules.flatMap((m) => {
    const node = m.get('module');
    if (node === undefined) return [];
    if (node.type === 'string') return [node.value];
    if (node.type === 'symbol') return [node.value];
    return [];
  });

type LintResult = { readonly ok: boolean; readonly missing: ReadonlyArray<string> };

const lintTarget = (target: CnjTarget, base: string): LintResult => {
  const modules = getModuleNames(target);
  if (modules.length === 0) return { ok: true, missing: [] };
  const missing = modules.filter((m) => !moduleExists(m, base));
  return { ok: missing.length === 0, missing };
};

const makeDecorationRange = (line: number): vscode.Range => {
  // DEVIATION(1.9): vscode.Range is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.Range(line, 0, line, 0);
};

const OK_DECORATION = vscode.window.createTextEditorDecorationType({
  gutterIconPath: vscode.Uri.parse(
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext x='2' y='13' font-size='12' fill='%2322c55e'%3E%E2%9C%93%3C/text%3E%3C/svg%3E`,
  ),
  gutterIconSize: 'contain',
});

const ERR_DECORATION = vscode.window.createTextEditorDecorationType({
  gutterIconPath: vscode.Uri.parse(
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext x='3' y='13' font-size='12' fill='%23ef4444'%3E%E2%9C%97%3C/text%3E%3C/svg%3E`,
  ),
  gutterIconSize: 'contain',
});

const targetMap = (targets: ReadonlyArray<CnjTarget>): ReadonlyMap<string, CnjTarget> =>
  intoMap(targets.map((target) => [target.name, target]));

const applyDiskLintDecorations = (editor: vscode.TextEditor): void => {
  if (!editor.document.fileName.endsWith('.cnj')) {
    editor.setDecorations(OK_DECORATION, []);
    editor.setDecorations(ERR_DECORATION, []);
    return;
  }
  const targetLines = findTargetLines(editor.document);
  if (targetLines.length === 0) {
    editor.setDecorations(OK_DECORATION, []);
    editor.setDecorations(ERR_DECORATION, []);
    return;
  }
  const parsed = parse(editor.document.getText());
  if (isErr(parsed)) return;
  const docResult = toCnjModel(parsed.value, editor.document.fileName);
  if (isErr(docResult)) return;

  const base = dirname(editor.document.fileName);
  const byName = targetMap(docResult.value.targets);
  const lintedTargets = targetLines.flatMap(({ name, line }) => {
    const target = byName.get(name);
    if (target === undefined) return [];
    return [{ line, result: lintTarget(target, base) }];
  });
  const okRanges: ReadonlyArray<vscode.DecorationOptions> = lintedTargets
    .filter(({ result }) => result.ok)
    .map(({ line }) => ({ range: makeDecorationRange(line) }));
  const errRanges: ReadonlyArray<vscode.DecorationOptions> = lintedTargets
    .filter(({ result }) => !result.ok)
    .map(({ line, result }) => ({
      range: makeDecorationRange(line),
      hoverMessage: `Missing modules: ${result.missing.join(', ')}`,
    }));

  editor.setDecorations(OK_DECORATION, okRanges);
  editor.setDecorations(ERR_DECORATION, errRanges);
};

export const registerDiskLintDecorations = (ctx: vscode.ExtensionContext): void => {
  // DEVIATION(1.9): ctx.subscriptions is a mutable VS Code adapter array.
  // eslint-disable-next-line functional/immutable-data
  ctx.subscriptions.push(
    OK_DECORATION,
    ERR_DECORATION,
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor !== undefined) applyDiskLintDecorations(editor);
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document !== doc) return;
      setTimeout(() => applyDiskLintDecorations(editor), 500);
    }),
  );
  const active = vscode.window.activeTextEditor;
  if (active !== undefined) applyDiskLintDecorations(active);
};

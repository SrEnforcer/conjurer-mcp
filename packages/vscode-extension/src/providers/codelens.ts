import * as vscode from 'vscode';
import { parse, toCnjModel } from '@conjurer/core';
import type { SymbolIndex, CnjCandidateForm } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

const CHARTER_RE = /^\s*\(charter\s/;
const SYMBOL_CALL_RE = /\(([a-zA-Z][a-zA-Z0-9_\-/]*)/g;
const TOP_FORM_RE = /^\(([a-zA-Z][a-zA-Z0-9_-]+)\s+(?:"([^"]+)"|([a-zA-Z][a-zA-Z0-9_-]*))/;
const CANDIDATE_FORM_RE = /^\(f\/candidate\s+:([a-zA-Z][a-zA-Z0-9_-]*)/;

export const findCharterLine = (lines: ReadonlyArray<string>): number | undefined => {
  const idx = lines.findIndex((l) => CHARTER_RE.test(l));
  return idx >= 0 ? idx : undefined;
};

export type SymbolOccurrence = { readonly line: number; readonly symbol: string };

export const findSymbolOccurrences = (
  lines: ReadonlyArray<string>,
  index: SymbolIndex,
): ReadonlyArray<SymbolOccurrence> =>
  lines.flatMap((lineText, lineNum): ReadonlyArray<SymbolOccurrence> =>
    Array.from(lineText.matchAll(SYMBOL_CALL_RE))
      .map((m): SymbolOccurrence => ({ line: lineNum, symbol: m[1] ?? '' }))
      .filter((o) => o.symbol.length > 0 && index.symbols.has(o.symbol)),
  );

export type FormOccurrence = { readonly line: number; readonly type: string; readonly name: string };

/**
 * Find all top-level named forms (charter, target, spell, asset, etc.).
 * Returns one entry per form with its line number, type, and name.
 */
export const findFormOccurrences = (lines: ReadonlyArray<string>): ReadonlyArray<FormOccurrence> =>
  lines.flatMap((lineText, lineNum): ReadonlyArray<FormOccurrence> => {
    const m = TOP_FORM_RE.exec(lineText);
    if (m === null) return [];
    const type = m[1] ?? '';
    const name = m[2] ?? m[3] ?? '';
    return type.length > 0 && name.length > 0 ? [{ line: lineNum, type, name }] : [];
  });

export type CandidateOccurrence = { readonly line: number; readonly id: string };

export const findCandidateOccurrences = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<CandidateOccurrence> =>
  lines.flatMap((text, line) => {
    const m = CANDIDATE_FORM_RE.exec(text);
    return m !== null && (m[1]?.length ?? 0) > 0 ? [{ line, id: m[1] ?? '' }] : [];
  });

const makeCharterLenses = (lineNum: number): ReadonlyArray<vscode.CodeLens> => {
  // DEVIATION(1.9): vscode.Range and vscode.CodeLens are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(lineNum, 0, lineNum, 0);
  return [
    // eslint-disable-next-line no-restricted-syntax
    new vscode.CodeLens(range, { title: '✓ Validate .cnj', command: 'conjurer.validateCnj', arguments: [] }),
    // eslint-disable-next-line no-restricted-syntax
    new vscode.CodeLens(range, { title: '? Show open questions', command: 'conjurer.showOpen', arguments: [] }),
    // eslint-disable-next-line no-restricted-syntax
    new vscode.CodeLens(range, { title: '🤖 Resolve open questions', command: 'conjurer.resolveOpenQuestions', arguments: [] }),
  ];
};

const makeSymbolLens = (occ: SymbolOccurrence): vscode.CodeLens => {
  // DEVIATION(1.9): vscode.Range and vscode.CodeLens are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(occ.line, 0, occ.line, 0);
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.CodeLens(range, { title: '⚡ Show examples', command: 'conjurer.showExamples', arguments: [occ.symbol] });
};

const totalCandidateScore = (c: CnjCandidateForm): number =>
  Array.from(c.scores.values()).reduce((a, b) => a + b, 0);

const makeCandidateScoreLens = (
  occ: CandidateOccurrence,
  candidate: CnjCandidateForm,
): vscode.CodeLens => {
  // DEVIATION(1.9): vscode.Range and vscode.CodeLens are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(occ.line, 0, occ.line, 0);
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.CodeLens(range, {
    title: `score: ${totalCandidateScore(candidate)} · ${candidate.status}`,
    command: 'conjurer.showCandidateDetails',
    arguments: [occ.id, totalCandidateScore(candidate), candidate.status],
  });
};

const makeCandidateActionLenses = (
  occ: CandidateOccurrence,
  candidate: CnjCandidateForm,
): ReadonlyArray<vscode.CodeLens> => {
  if (candidate.status !== 'proposed') return [];
  // DEVIATION(1.9): vscode.Range and vscode.CodeLens are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(occ.line, 0, occ.line, 0);
  return [
    // eslint-disable-next-line no-restricted-syntax
    new vscode.CodeLens(range, {
      title: '🔍 Critique',
      command: 'conjurer.critiqueCandidate',
      arguments: [occ.id, occ.line],
    }),
    // eslint-disable-next-line no-restricted-syntax
    new vscode.CodeLens(range, {
      title: '💬 Argue',
      command: 'conjurer.argueCandidate',
      arguments: [occ.id, occ.line],
    }),
  ];
};

const makeFormLens = (form: FormOccurrence): vscode.CodeLens => {
  // DEVIATION(1.9): vscode.Range and vscode.CodeLens are VS Code adapter types.
  // eslint-disable-next-line no-restricted-syntax
  const range = new vscode.Range(form.line, 0, form.line, 0);
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.CodeLens(range, {
    title: '✨ Refine',
    command: 'conjurer.refineForm',
    arguments: [form.type, form.name, form.line],
  });
};

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

export type ConjurerCodeLensProvider = vscode.CodeLensProvider;

export const createCodeLensProvider = (index: SymbolIndex): ConjurerCodeLensProvider => ({
  // DEVIATION(1.9): vscode.CodeLensProvider.provideCodeLenses must return a mutable CodeLens[].
  // eslint-disable-next-line functional/prefer-readonly-type
  provideCodeLenses: (document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] => {
    if (!document.fileName.endsWith('.cnj')) return [];
    const lines = getLines(document);
    const charterLine = findCharterLine(lines);
    const charterLenses = charterLine !== undefined ? makeCharterLenses(charterLine) : [];
    const symbolLenses = findSymbolOccurrences(lines, index).map(makeSymbolLens);
    const formLenses = findFormOccurrences(lines).map(makeFormLens);
    const candidateOccs = findCandidateOccurrences(lines);
    const [candidateScoreLenses, candidateActionLenses] = ((): [
      ReadonlyArray<vscode.CodeLens>,
      ReadonlyArray<vscode.CodeLens>,
    ] => {
      if (candidateOccs.length === 0) return [[], []];
      const parsed = parse(document.getText());
      if (isErr(parsed)) return [[], []];
      const docResult = toCnjModel(parsed.value, document.fileName);
      if (isErr(docResult)) return [[], []];
      const byId = new Map(docResult.value.candidates.map((c) => [c.id, c]));
      const scores = candidateOccs.flatMap((occ) => {
        const c = byId.get(occ.id);
        return c !== undefined ? [makeCandidateScoreLens(occ, c)] : [];
      });
      const actions = candidateOccs.flatMap((occ) => {
        const c = byId.get(occ.id);
        return c !== undefined ? makeCandidateActionLenses(occ, c) : [];
      });
      return [scores, actions];
    })();
    return [...charterLenses, ...symbolLenses, ...formLenses, ...candidateScoreLenses, ...candidateActionLenses];
  },
});

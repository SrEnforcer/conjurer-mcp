import * as vscode from 'vscode';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse, toCnjModel } from '@conjurer/core';
import type { SymbolIndex, CnjCandidateForm, CnjDocument } from '@conjurer/core';
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

const GOALS_RE = /^\s*:goals\b/;

/**
 * Find the line containing :goals within the charter form body.
 * Scans from charterLine+1 and stops at the next top-level form or EOF.
 */
export const findGoalsLine = (lines: ReadonlyArray<string>, charterLine: number): number | undefined => {
  const charterBody = lines.slice(charterLine + 1);
  const nextTopFormIndex = charterBody.findIndex((line) => /^\([a-zA-Z]/.test(line));
  const searchWindow = nextTopFormIndex === -1 ? charterBody : charterBody.slice(0, nextTopFormIndex);
  const goalsOffset = searchWindow.findIndex((line) => GOALS_RE.test(line));
  return goalsOffset === -1 ? undefined : charterLine + 1 + goalsOffset;
};

const makeRange = (lineNum: number): vscode.Range => {
  // DEVIATION(1.9): vscode.Range is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.Range(lineNum, 0, lineNum, 0);
};

const makeLens = (
  args: {
    readonly args: ReadonlyArray<unknown>;
    readonly command: string;
    readonly lineNum: number;
    readonly title: string;
  },
): vscode.CodeLens => {
  const { lineNum, title, command, args: commandArgs } = args;
  // DEVIATION(1.9): vscode.CodeLens is a VS Code adapter type.
  // eslint-disable-next-line no-restricted-syntax
  return new vscode.CodeLens(makeRange(lineNum), { title, command, arguments: [...commandArgs] });
};

const optionalLens = (lens: vscode.CodeLens | undefined): ReadonlyArray<vscode.CodeLens> =>
  lens === undefined ? [] : [lens];

const makeGoalsLens = (lineNum: number): vscode.CodeLens => {
  return makeLens({ lineNum, title: '↻ Refresh goals', command: 'conjurer.refreshGoals', args: [] });
};

const makeCharterLenses = (lineNum: number): ReadonlyArray<vscode.CodeLens> => {
  return [
    makeLens({ lineNum, title: '✓ Validate .cnj', command: 'conjurer.validateCnj', args: [] }),
    makeLens({ lineNum, title: '? Show open questions', command: 'conjurer.showOpen', args: [] }),
    makeLens({ lineNum, title: '🤖 Resolve open questions', command: 'conjurer.resolveOpenQuestions', args: [] }),
  ];
};

const makeCharterRefLens = (
  lineNum: number,
  references: ReadonlyArray<string>,
  filePath: string,
): vscode.CodeLens | undefined => {
  if (references.length === 0) return undefined;
  const base = dirname(filePath);
  const resolved = references.map((r) => existsSync(resolve(base, r)));
  const found = resolved.filter(Boolean).length;
  const broken = references.length - found;
  if (broken === 0) {
    return makeLens({ lineNum, title: `${found}/${references.length} refs resolved`, command: '', args: [] });
  }
  return makeLens(
    {
      lineNum,
      title: `⚠ ${broken} broken reference${broken === 1 ? '' : 's'}`,
      command: 'conjurer.validateCnj',
      args: [],
    },
  );
};

const makeSymbolLens = (occ: SymbolOccurrence): vscode.CodeLens => {
  return makeLens({ lineNum: occ.line, title: '⚡ Show examples', command: 'conjurer.showExamples', args: [occ.symbol] });
};

const totalCandidateScore = (c: CnjCandidateForm): number =>
  Array.from(c.scores.values()).reduce((a, b) => a + b, 0);

const makeCandidateScoreLens = (
  occ: CandidateOccurrence,
  candidate: CnjCandidateForm,
): vscode.CodeLens => {
  return makeLens(
    {
      lineNum: occ.line,
      title: `score: ${totalCandidateScore(candidate)} · ${candidate.status}`,
      command: 'conjurer.showCandidateDetails',
      args: [occ.id, totalCandidateScore(candidate), candidate.status],
    },
  );
};

const scoreRecordFromCandidate = (candidate: CnjCandidateForm): Record<string, number> =>
  Object.fromEntries(candidate.scores.entries());

const proposedCandidateLenses = (occ: CandidateOccurrence): ReadonlyArray<vscode.CodeLens> => [
  makeLens({ lineNum: occ.line, title: '🔍 Critique', command: 'conjurer.critiqueCandidate', args: [occ.id, occ.line] }),
  makeLens({ lineNum: occ.line, title: '💬 Argue', command: 'conjurer.argueCandidate', args: [occ.id, occ.line] }),
];

const hoistCandidateLens = (occ: CandidateOccurrence, score: number): ReadonlyArray<vscode.CodeLens> =>
  score >= 28
    ? [makeLens({ lineNum: occ.line, title: '⬆ Hoist', command: 'conjurer.hoistCandidate', args: [occ.id, occ.line] })]
    : [];

const makeCandidateActionLenses = (
  occ: CandidateOccurrence,
  candidate: CnjCandidateForm,
): ReadonlyArray<vscode.CodeLens> => {
  const isActive = candidate.status === 'proposed' || candidate.status === 'planned';
  if (!isActive) return [];
  const score = totalCandidateScore(candidate);
  return [
    makeLens({
      lineNum: occ.line,
      title: '📊 Reassess',
      command: 'conjurer.reassessCandidate',
      args: [occ.id, occ.line, scoreRecordFromCandidate(candidate)],
    }),
    ...(candidate.status === 'proposed' ? proposedCandidateLenses(occ) : []),
    ...(candidate.status === 'planned' ? hoistCandidateLens(occ, score) : []),
  ];
};

const makeFormLens = (form: FormOccurrence): vscode.CodeLens => {
  return makeLens({ lineNum: form.line, title: '✨ Refine', command: 'conjurer.refineForm', args: [form.type, form.name, form.line] });
};

const getLines = (document: vscode.TextDocument): ReadonlyArray<string> =>
  Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);

export type ConjurerCodeLensProvider = vscode.CodeLensProvider;

const parseDocumentModel = (
  document: vscode.TextDocument,
  shouldParse: boolean,
): CnjDocument | undefined => {
  if (!shouldParse) return undefined;
  const parsed = parse(document.getText());
  if (isErr(parsed)) return undefined;
  const modelResult = toCnjModel(parsed.value, document.fileName);
  return isErr(modelResult) ? undefined : modelResult.value;
};

const makeCharterRefLenses = (
  charterLine: number | undefined,
  parsedDoc: CnjDocument | undefined,
  fileName: string,
): ReadonlyArray<vscode.CodeLens> =>
  charterLine === undefined || parsedDoc === undefined
    ? []
    : optionalLens(makeCharterRefLens(charterLine, parsedDoc.charter.references, fileName));

const candidateLenses = (
  occurrences: ReadonlyArray<CandidateOccurrence>,
  parsedDoc: CnjDocument | undefined,
): readonly [ReadonlyArray<vscode.CodeLens>, ReadonlyArray<vscode.CodeLens>] => {
  if (occurrences.length === 0 || parsedDoc === undefined) return [[], []];
  const scoreLenses = occurrences.flatMap((occurrence) => {
    const candidate = parsedDoc.candidates.find((item) => item.id === occurrence.id);
    return candidate === undefined ? [] : [makeCandidateScoreLens(occurrence, candidate)];
  });
  const actionLenses = occurrences.flatMap((occurrence) => {
    const candidate = parsedDoc.candidates.find((item) => item.id === occurrence.id);
    return candidate === undefined ? [] : makeCandidateActionLenses(occurrence, candidate);
  });
  return [scoreLenses, actionLenses];
};

const documentCodeLenses = (
  document: vscode.TextDocument,
  index: SymbolIndex,
): ReadonlyArray<vscode.CodeLens> => {
  const lines = getLines(document);
  const charterLine = findCharterLine(lines);
  const candidateOccs = findCandidateOccurrences(lines);
  const parsedDoc = parseDocumentModel(document, charterLine !== undefined || candidateOccs.length > 0);
  const goalsLine = charterLine === undefined ? undefined : findGoalsLine(lines, charterLine);
  const [candidateScoreLenses, candidateActionLenses] = candidateLenses(candidateOccs, parsedDoc);

  return [
    ...(charterLine === undefined ? [] : makeCharterLenses(charterLine)),
    ...makeCharterRefLenses(charterLine, parsedDoc, document.fileName),
    ...(goalsLine === undefined ? [] : [makeGoalsLens(goalsLine)]),
    ...findSymbolOccurrences(lines, index).map(makeSymbolLens),
    ...findFormOccurrences(lines).map(makeFormLens),
    ...candidateScoreLenses,
    ...candidateActionLenses,
  ];
};

export const mkCodeLensProvider = (index: SymbolIndex): ConjurerCodeLensProvider => ({
  // DEVIATION(1.9): vscode.CodeLensProvider.provideCodeLenses must return a mutable CodeLens[].
  // eslint-disable-next-line functional/prefer-readonly-type
  provideCodeLenses: (document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] =>
    document.fileName.endsWith('.cnj') ? [...documentCodeLenses(document, index)] : [],
});

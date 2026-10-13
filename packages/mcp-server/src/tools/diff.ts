/**
 * Semantic diff tools for cnj document pairs.
 */
import { readFileSync, existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parse, toCnjModel, effectiveScores } from '@conjurer/core';
import type { Charter, CnjDocument, CnjCandidateForm, CnjHoist } from '@conjurer/core';
import type { EdnNode } from '@conjurer/core';
import { isErr, entriesOf, intoMap } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];

type ScalarChange = { readonly before: string; readonly after: string } | null;
type ArrayDiff<T> = { readonly added: ReadonlyArray<T>; readonly removed: ReadonlyArray<T> };

const ednToJson = (n: EdnNode): unknown => {
  if (n.type === 'map') {
    return Object.fromEntries(
      entriesOf(n.entries).map(([k, v]: readonly [string, EdnNode]) => [k, ednToJson(v)]),
    );
  }
  if (n.type === 'list') return n.elements.map(ednToJson);
  if (n.type === 'number' || n.type === 'boolean') return n.value;
  if (n.type === 'nil') return null;
  if (n.type === 'string') return n.value;
  return n.type === 'keyword' ? n.value.substring(1) : n.value;
};

const diffScalar = (a: string, b: string): ScalarChange =>
  a === b ? null : { before: a, after: b };

const diffStringArray = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): ArrayDiff<string> => {
  const setA = intoMap(a.map((value) => [value, true] as const));
  const setB = intoMap(b.map((value) => [value, true] as const));
  return {
    added: b.filter((x) => !setA.has(x)),
    removed: a.filter((x) => !setB.has(x)),
  };
};

const toMapNode = (entries: ReadonlyMap<string, EdnNode>): EdnNode => ({
  type: 'map',
  line: 0,
  column: 0,
  entries,
});

const decisionFingerprint = (d: ReadonlyMap<string, EdnNode>): string =>
  JSON.stringify(ednToJson(toMapNode(d)));

const diffDecisions = (
  a: ReadonlyArray<ReadonlyMap<string, EdnNode>>,
  b: ReadonlyArray<ReadonlyMap<string, EdnNode>>,
): ArrayDiff<unknown> => {
  const fpA = intoMap(a.map((value) => [decisionFingerprint(value), true] as const));
  const fpB = intoMap(b.map((value) => [decisionFingerprint(value), true] as const));
  const added = b.filter((d) => !fpA.has(decisionFingerprint(d)))
    .map((d) => ednToJson(toMapNode(d)));
  const removed = a.filter((d) => !fpB.has(decisionFingerprint(d)))
    .map((d) => ednToJson(toMapNode(d)));
  return { added, removed };
};

const diffCharter = (a: Charter, b: Charter): {
  readonly title: ScalarChange;
  readonly version: ScalarChange;
  readonly goals: ArrayDiff<string>;
  readonly decisions: ArrayDiff<unknown>;
  readonly open: ArrayDiff<string>;
  readonly references: ArrayDiff<string>;
} => ({
  title: diffScalar(a.title, b.title),
  version: diffScalar(a.version, b.version),
  goals: diffStringArray(a.goals, b.goals),
  decisions: diffDecisions(a.decisions, b.decisions),
  open: diffStringArray(a.open, b.open),
  references: diffStringArray(a.references, b.references),
});

const countDiff = (d: {
  readonly added: ReadonlyArray<unknown>;
  readonly removed: ReadonlyArray<unknown>;
}): number =>
  d.added.length + d.removed.length;

const readDoc = (filePath: string): CnjDocument | string => {
  if (!existsSync(filePath)) return `File not found: ${filePath}`;
  const src = readFileSync(filePath, 'utf8');
  const parsed = parse(src);
  if (isErr(parsed)) return `Parse error in ${filePath}: ${parsed.error.message}`;
  const doc = toCnjModel(parsed.value, filePath);
  if (isErr(doc)) return `Model error in ${filePath}: ${doc.error}`;
  return doc.value;
};

type CandSummary = {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly total_score: number;
};

type ScoreDelta = { readonly before: number; readonly after: number };
type StatusChange = { readonly id: string; readonly label: string; readonly before: string; readonly after: string };
type ScoreChange = {
  readonly id: string;
  readonly label: string;
  readonly score_changes: Record<string, ScoreDelta>;
  readonly total_before: number;
  readonly total_after: number;
};
type HoistedChange = { readonly id: string; readonly label: string; readonly hoist_date: string; readonly into: string };

const candTotal = (c: CnjCandidateForm): number =>
  Array.from(effectiveScores(c).values()).reduce((a, b) => a + b, 0);

const candSummary = (c: CnjCandidateForm): CandSummary => ({
  id: c.id, label: c.label, status: c.status, total_score: candTotal(c),
});

const scoreKeys = (candidateA: CnjCandidateForm, candidateB: CnjCandidateForm): ReadonlyArray<string> =>
  Array.from(
    intoMap(
      [...effectiveScores(candidateA).keys(), ...effectiveScores(candidateB).keys()]
        .map((key) => [key, true] as const),
    ).keys(),
  );

const buildScoreRecord = (
  candidateA: CnjCandidateForm,
  candidateB: CnjCandidateForm,
): Record<string, ScoreDelta> => {
  const effA = effectiveScores(candidateA);
  const effB = effectiveScores(candidateB);
  return scoreKeys(candidateA, candidateB).reduce<Record<string, ScoreDelta>>((acc, key) => {
    const before = effA.get(key) ?? 0;
    const after = effB.get(key) ?? 0;
    return before === after ? acc : { ...acc, [key]: { before, after } };
  }, {});
};

const toHoistedChange = (
  candidate: CnjCandidateForm,
  hoistMap: ReadonlyMap<string, CnjHoist>,
): ReadonlyArray<HoistedChange> => {
  const hoist = hoistMap.get(candidate.id);
  return hoist === undefined
    ? []
    : [{ id: candidate.id, label: candidate.label, hoist_date: hoist.date, into: hoist.into }];
};

const toStatusChange = (
  candidate: CnjCandidateForm,
  candidateMap: ReadonlyMap<string, CnjCandidateForm>,
): ReadonlyArray<StatusChange> => {
  const next = candidateMap.get(candidate.id);
  return next !== undefined && next.status !== candidate.status
    ? [{ id: candidate.id, label: candidate.label, before: candidate.status, after: next.status }]
    : [];
};

const toScoreChange = (
  candidate: CnjCandidateForm,
  candidateMap: ReadonlyMap<string, CnjCandidateForm>,
): ReadonlyArray<ScoreChange> => {
  const next = candidateMap.get(candidate.id);
  if (next === undefined) return [];
  const scoreChanges = buildScoreRecord(candidate, next);
  return Object.keys(scoreChanges).length === 0
    ? []
    : [{
      id: candidate.id,
      label: candidate.label,
      score_changes: scoreChanges,
      total_before: candTotal(candidate),
      total_after: candTotal(next),
    }];
};

const diffCandidates = (
  docA: CnjDocument,
  docB: CnjDocument,
): {
  readonly added: ReadonlyArray<CandSummary>;
  readonly removed: ReadonlyArray<CandSummary>;
  readonly status_changes: ReadonlyArray<StatusChange>;
  readonly score_changes: ReadonlyArray<ScoreChange>;
  readonly hoisted: ReadonlyArray<HoistedChange>;
} => {
  const mapA = intoMap(docA.candidates.map((c) => [c.id, c] as const));
  const mapB = intoMap(docB.candidates.map((c) => [c.id, c] as const));
  const hoistMap = intoMap(docB.hoists.map((h: CnjHoist) => [h.of, h] as const));

  const added = docB.candidates.filter((c) => !mapA.has(c.id)).map(candSummary);

  const removedOrHoisted = docA.candidates.filter((c) => !mapB.has(c.id));
  const hoisted = removedOrHoisted.flatMap((candidate) => toHoistedChange(candidate, hoistMap));
  const removed = removedOrHoisted.filter((c) => !hoistMap.has(c.id)).map(candSummary);

  const shared = docA.candidates.filter((c) => mapB.has(c.id));

  const status_changes = shared.flatMap((candidate) => toStatusChange(candidate, mapB));
  const score_changes = shared.flatMap((candidate) => toScoreChange(candidate, mapB));

  return { added, removed, status_changes, score_changes, hoisted };
};

/**
 * Compute semantic differences in f/candidate backlog between two cnj files.
 *
 * @param pathA - Baseline file path.
 * @param pathB - Target file path.
 * @returns Tool text content payload.
 */
export const handleDiffCandidates = (pathA: string, pathB: string): ToolContent => {
  const docA = readDoc(pathA);
  if (typeof docA === 'string') return toContent(docA);
  const docB = readDoc(pathB);
  if (typeof docB === 'string') return toContent(docB);

  const diff = diffCandidates(docA, docB);
  const changeCount =
    diff.added.length + diff.removed.length +
    diff.status_changes.length + diff.score_changes.length + diff.hoisted.length;

  return toContent(JSON.stringify({
    candidates: diff,
    summary: { has_changes: changeCount > 0, change_count: changeCount, graduation_count: diff.hoisted.length },
  }, null, 2));
};

/**
 * Compute semantic differences between two cnj files.
 *
 * @param pathA - Baseline file path.
 * @param pathB - Target file path.
 * @returns Tool text content payload.
 */
export const handleDiffCnj = (pathA: string, pathB: string): ToolContent => {
  const docA = readDoc(pathA);
  if (typeof docA === 'string') return toContent(docA);
  const docB = readDoc(pathB);
  if (typeof docB === 'string') return toContent(docB);

  const charter = diffCharter(docA.charter, docB.charter);
  const targets = diffStringArray(
    docA.targets.map((t) => t.name),
    docB.targets.map((t) => t.name),
  );
  const assets = diffStringArray(
    docA.assets.map((a) => a.name),
    docB.assets.map((a) => a.name),
  );

  const changeCount =
    (charter.title !== null ? 1 : 0) +
    (charter.version !== null ? 1 : 0) +
    countDiff(charter.goals) +
    countDiff(charter.decisions) +
    countDiff(charter.open) +
    countDiff(charter.references) +
    countDiff(targets) +
    countDiff(assets);

  return toContent(JSON.stringify({
    charter,
    targets,
    assets,
    summary: { has_changes: changeCount > 0, change_count: changeCount },
  }, null, 2));
};

/**
 * Register semantic diff MCP tools.
 *
 * @param server - MCP server instance.
 * @returns No return value.
 */
export const registerDiffTools = (server: McpServer): void => {
  server.registerTool('diff_cnj', {
    description: 'Return a structured semantic diff between two .cnj files',
    inputSchema: { path_a: z.string(), path_b: z.string() },
  }, ({ path_a, path_b }) => ({ content: [...handleDiffCnj(path_a, path_b)] }));

  server.registerTool('diff_candidates', {
    description:
      'Return a semantic diff of the f/candidate backlog between two .cnj snapshots: ' +
      'candidates added/removed, status changes, score deltas, and graduated candidates ' +
      '(present in A, hoisted in B). Keyed by stable :id.',
    inputSchema: { path_a: z.string().describe('Baseline .cnj path'), path_b: z.string().describe('Target .cnj path') },
  }, ({ path_a, path_b }) => ({ content: [...handleDiffCandidates(path_a, path_b)] }));
};

import * as vscode from 'vscode';
import { parse, toCnjModel, effectiveScores } from '@conjurer/core';
import type { CnjCandidateForm } from '@conjurer/core';
import { isErr } from '@tsfpp/prelude';

// ── Pure helpers (no VS Code dependency) ──────────────────────────────────

const TOP_LEVEL_FORM = /^\([a-zA-Z]/;

/**
 * Collect raw lines of a form starting at startLine, stopping at the next
 * top-level form or EOF. Caps at 80 lines to keep prompts manageable.
 */
export const extractFormContent = (lines: ReadonlyArray<string>, startLine: number): string => {
  const MAX = 80;
  const window = lines.slice(startLine, startLine + MAX);
  const nextTopLevel = window.slice(1).findIndex((line) => TOP_LEVEL_FORM.test(line));
  const formWindow = nextTopLevel === -1 ? window : window.slice(0, nextTopLevel + 1);
  return formWindow.join('\n');
};

const FORM_GUIDANCE: Readonly<Record<string, string>> = {
  charter: [
    'Are the :goals specific and testable, or are they vague aspirations?',
    'Does each :decisions entry have clear rationale, or is the "why" missing?',
    'Are there unresolved tensions between decisions that should become :open questions?',
    'Are :references complete — every file this charter depends on declared?',
    'What would a new reader need to understand this charter that is not here?',
  ].join('\n'),
  target: [
    'Are the :modules complete and consistent with what :produces declares?',
    'Are all upstream :from dependencies declared — nothing assumed implicit?',
    'Is the :responsibility description specific enough to be unambiguous?',
    'Are :est-lines realistic — not padded, not underestimated?',
    'What would prevent materialisation of this target from succeeding?',
  ].join('\n'),
  spell: [
    'Is every :requires item manifested in :manifest? Any missing?',
    'Should any :deferred items be promoted to :requires given current state?',
    'Is :purpose clear and bounded — not two responsibilities masquerading as one?',
    'Does this spell have everything it needs, or does it silently depend on context?',
    'Are the :manifest items ordered by dependency, or arbitrary?',
  ].join('\n'),
  asset: [
    'Is this asset constraint well-bounded and verifiable — can it be checked?',
    'Is it at the right specificity: not so broad it is always true, not so narrow it cannot apply?',
    'What invariant does this asset protect, and is that invariant explicitly captured?',
    'Who or what enforces this asset — is that enforcement path documented?',
  ].join('\n'),
  context: [
    'Is the :scope well-defined — what is in and out of scope?',
    'Are there assumptions embedded in this context that should be surfaced explicitly?',
    'Does this context constrain downstream forms in ways that are not yet declared?',
  ].join('\n'),
  assume: [
    'Is this assumption actually verifiable, or is it closer to a belief?',
    'What breaks if this assumption turns out to be false?',
    'Is the :condition precise enough to test at a specific point in time?',
  ].join('\n'),
  'f/candidate': [
    'Is the :rationale backed by specific evidence, or is it assertion-heavy?',
    'Are the :conditions precise enough to be checkable — not vague "if we decide X"?',
    'Is each score dimension honest, or inflated to push the total above threshold?',
    'What is the strongest argument AGAINST hoisting this candidate right now?',
    'Is the :cluster assignment correct — does this belong in a different cluster?',
    'What would concretely need to change for this to become :planned?',
  ].join('\n'),
};

const defaultGuidance = (type: string): string =>
  `Examine this ${type} form for completeness, internal consistency, and clarity. What is missing? What is ambiguous? What would a careful reader question?`;

/**
 * Build a Conjurer `refine`-framed prompt for a named form.
 * Pure — no side effects, fully testable.
 */
export const buildRefinePrompt = ({
  filePath,
  formContent,
  formName,
  formType,
}: {
  readonly filePath: string;
  readonly formContent: string;
  readonly formName: string;
  readonly formType: string;
}): string => {
  const guidance = FORM_GUIDANCE[formType] ?? defaultGuidance(formType);
  return [
    `Using Conjurer's \`refine\` construct — iterative enhancement of an existing form without starting over.`,
    ``,
    `File: ${filePath}`,
    `Form type: ${formType}`,
    `Form name: ${formName}`,
    ``,
    `Current form:`,
    `\`\`\``,
    formContent.trim(),
    `\`\`\``,
    ``,
    `Refine guidance (${formType}-specific):`,
    guidance,
    ``,
    `Using \`refine\` key parameters, provide:`,
    `- **:focus-on** — the one or two things most worth improving right now`,
    `- **:add** — what is missing and should be added`,
    `- **:adjust** — what exists but needs rewording, reordering, or restructuring`,
    `- **:without** — what must NOT be changed (load-bearing invariants to preserve)`,
    `- **:when** — any conditions under which this form should change (trigger events)`,
    ``,
    `Be specific and reference the actual content above, not generic advice.`,
  ].join('\n');
};

/**
 * Build a `r/hypothesise` + `r/argue` framed prompt for resolving open questions.
 * Pure — no side effects, fully testable.
 */
export const buildResolveOpenPrompt = (
  questions: ReadonlyArray<string>,
  charterContent: string,
  filePath: string,
): string => [
  `Using Conjurer reasoning constructs to resolve open questions in a design charter.`,
  ``,
  `Constructs in use:`,
  `- \`r/hypothesise\`: generate candidate resolutions ranked by plausibility`,
  `- \`r/argue\`: construct a formal argument for the recommended resolution`,
  `- \`r/check\`: verify each resolution is consistent with decisions already made`,
  ``,
  `File: ${filePath}`,
  ``,
  `Charter context (for consistency checking):`,
  `\`\`\``,
  charterContent.trim(),
  `\`\`\``,
  ``,
  `Open questions to resolve (${questions.length}):`,
  ...questions.map((q, i) => `${i + 1}. ${q}`),
  ``,
  `For each open question, provide:`,
  `a) **Recommended resolution** — the answer you would commit to (1–3 sentences)`,
  `b) **Reasoning** — which existing decisions or constraints drive this resolution?`,
  `c) **Consistency check** — does this contradict anything already decided? If so, flag it.`,
  `d) **:decisions entry to append** — exact EDN: \`{:date "YYYY-MM-DD" :decision "..."}\``,
  `e) **Status** — can this question be closed now, or does it need more information first?`,
].join('\n');

/**
 * Build a `r/argue` adversarial prompt for a :proposed candidate.
 * Asks the LLM to surface weaknesses and output revised EDN for copy-paste.
 * Pure — no side effects, fully testable.
 */
export const buildCritiquePrompt = (
  candidateId: string,
  formContent: string,
  filePath: string,
): string =>
  [
    `Using Conjurer's \`r/argue\` construct in adversarial mode: surface the weaknesses in this candidate.`,
    ``,
    `File: ${filePath}`,
    `Candidate: ${candidateId}`,
    ``,
    `Form:`,
    `\`\`\``,
    formContent.trim(),
    `\`\`\``,
    ``,
    `Critique framing (be adversarial — find what is wrong, missing, or overstated):`,
    `- **:rationale weaknesses** — what claims are unsupported or circular?`,
    `- **:conditions gaps** — which conditions are vague, unverifiable, or already resolved?`,
    `- **:scores challenges** — which dimension scores are inflated? What justifies a lower score?`,
    `- **:cluster fit** — does this belong in a different cluster, or is the scope wrong?`,
    `- **counter-argument** — what is the strongest case for NOT hoisting this candidate?`,
    ``,
    `Conclude with: is this candidate ready to progress, or what must change first?`,
    `If revisions are warranted, output the revised EDN block starting with \`(f/candidate :${candidateId}\`.`,
  ].join('\n');

/**
 * Build a `r/hypothesise` + `r/argue` constructive prompt for a :proposed candidate.
 * Asks the LLM to strengthen the case and output an f/reassess history node.
 * Pure — no side effects, fully testable.
 */
export const buildArguePrompt = (
  candidateId: string,
  formContent: string,
  filePath: string,
): string =>
  [
    `Using Conjurer's \`r/hypothesise\` + \`r/argue\` constructs: build the strongest case for this candidate.`,
    ``,
    `File: ${filePath}`,
    `Candidate: ${candidateId}`,
    ``,
    `Form:`,
    `\`\`\``,
    formContent.trim(),
    `\`\`\``,
    ``,
    `Argue framing (be constructive — strengthen the case, fill gaps, harden conditions):`,
    `- **:rationale strengthening** — what supporting evidence or reasoning should be added?`,
    `- **:conditions clarification** — restate each condition so it is precisely checkable`,
    `- **:scores defence** — justify each dimension score with a specific reason`,
    `- **path to :planned** — what concrete next step would move this from :proposed to :planned?`,
    `- **r/hypothesise** — generate 2–3 candidate resolutions for the most uncertain condition`,
    ``,
    `If revisions are warranted, output the revised EDN block starting with \`(f/candidate :${candidateId}\`.`,
    `Also output a \`(f/reassess :of :${candidateId}\` block capturing the argument as a history node.`,
  ].join('\n');

/**
 * Build a prompt asking the IDE LLM to refresh :goals based on current
 * project knowledge (settled decisions) and stated future intent (candidates).
 * Pure — no side effects, fully testable.
 */
const effectiveTotal = (candidate: CnjCandidateForm): number =>
  Array.from(effectiveScores(candidate).values()).reduce((left, right) => left + right, 0);

const isActiveCandidate = (candidate: CnjCandidateForm): boolean =>
  candidate.status === 'proposed' || candidate.status === 'planned';

const summarizeCandidate = (candidate: CnjCandidateForm): string =>
  `  [${candidate.cluster}] ${candidate.id} (score ${effectiveTotal(candidate)}, ${candidate.status}) — ${candidate.rationale.slice(0, 120).replace(/\s+/g, ' ')}`;

const candidateSummaryLines = (candidates: ReadonlyArray<CnjCandidateForm>): string => {
  const activeCandidates = [...candidates]
    .filter(isActiveCandidate)
    .sort((left, right) => effectiveTotal(right) - effectiveTotal(left));
  return activeCandidates.length === 0 ? '  (none)' : activeCandidates.map(summarizeCandidate).join('\n');
};

const REFRESH_GOALS_GUIDANCE: ReadonlyArray<string> = [
  `Refresh guidance:`,
  `- Goals must reflect where the project is ACTUALLY going, not where it started.`,
  `- Each goal should be specific enough to be falsifiable: "provide X to Y" not "support Z".`,
  `- Candidate clusters reveal coherent future intent — if the backlog consistently targets a domain, that intent belongs in :goals.`,
  `- Settled decisions constrain goals: goals that contradict closed decisions should be removed or rewritten.`,
  `- Aim for 4–6 goals. Prune stale aspirations rather than accumulating new ones.`,
  ``,
  `Provide:`,
  `a) **Proposed :goals list** — EDN-ready strings, one per line, ready to paste`,
  `b) **Changes explained** — what was added, removed, or reworded and why`,
  `c) **Stale goals removed** — any current goal the evidence does not support (and why it was cut)`,
];

export const buildRefreshGoalsPrompt = ({
  goals,
  candidates,
  charterContent,
  filePath,
}: {
  readonly candidates: ReadonlyArray<CnjCandidateForm>;
  readonly charterContent: string;
  readonly filePath: string;
  readonly goals: ReadonlyArray<string>;
}): string => {
  const activeCandidates = candidates.filter(isActiveCandidate);
  return [
    `Using Conjurer's \`refine\` construct — refreshing :goals to reflect current project knowledge and future intent.`,
    ``,
    `File: ${filePath}`,
    ``,
    `Current :goals (${goals.length}):`,
    ...goals.map((g, i) => `${i + 1}. ${g}`),
    ``,
    `Charter context (decisions and open questions for consistency checking):`,
    `\`\`\``,
    charterContent.trim().slice(0, 3000),
    `\`\`\``,
    ``,
    `Active candidates — stated future intent (${activeCandidates.length}):`,
    candidateSummaryLines(candidates),
    ``,
    ...REFRESH_GOALS_GUIDANCE,
  ].join('\n');
};

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

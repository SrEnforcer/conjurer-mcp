/**
 * Prompt builder for the Decide command: a substantive re-evaluation of one
 * `f/candidate` that must end in a verdict, recorded as a dated `f/reassess`
 * (foresight.md). Pure: no VS Code dependency, and the date is a parameter.
 */
import { effectiveScores } from '@conjurer/core';
import type { CnjCandidateForm } from '@conjurer/core';
import { effectiveTotal } from './refine-prompts.js';

export type DecidePromptInput = {
  readonly candidate: CnjCandidateForm;
  /** Every candidate in the file; the one being decided is left out of the comparison list. */
  readonly candidates: ReadonlyArray<CnjCandidateForm>;
  readonly charterContent: string;
  readonly filePath: string;
  readonly formContent: string;
  readonly goals: ReadonlyArray<string>;
  /** Today, `YYYY-MM-DD`; read from the clock by the caller. */
  readonly today: string;
};

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

const scoreBreakdown = (candidate: CnjCandidateForm): string =>
  Array.from(effectiveScores(candidate).entries()).map(([dim, n]) => `${dim} ${n}`).join(', ');

const lastReassessed = (candidate: CnjCandidateForm): string =>
  candidate.history.at(-1)?.date ?? 'never';

const statusLine = (candidate: CnjCandidateForm, today: string): string =>
  `Status: ${candidate.status} · score ${effectiveTotal(candidate)} (${scoreBreakdown(candidate)})`
  + ` · added ${candidate.added.length > 0 ? candidate.added : 'unknown'} · last reassessed ${lastReassessed(candidate)} · today ${today}`;

const isActive = (candidate: CnjCandidateForm): boolean =>
  candidate.status === 'proposed' || candidate.status === 'planned';

const otherCandidateLines = (subject: CnjCandidateForm, candidates: ReadonlyArray<CnjCandidateForm>): ReadonlyArray<string> => {
  const others = candidates
    .filter((c) => c.id !== subject.id && isActive(c))
    .sort((left, right) => effectiveTotal(right) - effectiveTotal(left))
    .map((c) => {
      const sameCluster = c.cluster.length > 0 && c.cluster === subject.cluster ? ' (same cluster)' : '';
      return `  ${c.id}: ${c.label} (score ${effectiveTotal(c)}, ${c.status})${sameCluster}`;
    });
  return others.length === 0 ? ['  (none)'] : others;
};

const EVALUATION_STEPS: ReadonlyArray<string> = [
  `**Step 1: evaluate on substance.** Answer each in one to three sentences, citing the goals, decisions, other candidates or code that drive the answer:`,
  `- **Problem**: what concrete problem does this solve, and for whom? Is there evidence it actually occurs, or only that it could?`,
  `- **Cost of never doing it**: what is lost if this is dropped for good? If the honest answer is "not much", say so.`,
  `- **Goal fit**: which :goals does it serve? A candidate that serves none is a strong signal to abandon it.`,
  `- **Overlap**: is it already covered, wholly or partly, by a decision, a built feature, or another candidate listed above?`,
  `- **Conditions**: are its :conditions checkable? Are any already met, or no longer reachable?`,
  `- **Scores**: which scores would you move today, and why? A move must come from a change in context, not from correcting the original.`,
  `If you can read the workspace, check the code before you claim something is or is not already built.`,
  ``,
  `**Step 2: ask me.** List the questions whose answers would change the verdict (at most four), and for each say what the possible answers would imply. Do not ask what you can find out from the file or the code. Then stop and wait for my answers.`,
  ``,
  `**Step 3: verdict.** After my answers, choose exactly one. "Needs more thought" is not an option:`,
  `- **plan** (\`:status :planned\`): worth doing, and its conditions are met or close.`,
  `- **keep** (no :status): still worth carrying, but not now. Only valid with at least one sharpened, checkable condition that would trigger the next look, stated in the rationale.`,
  `- **abandon** (\`:status :abandoned\`): no longer worth carrying. Say what would have to change to revive it.`,
  `Give the verdict in one line, then the argument for it and the strongest argument against it.`,
  ``,
];

const recordStep = (id: string, today: string): ReadonlyArray<string> => [
  `**Step 4: record it.** Write the verdict as one \`f/reassess\` block:`,
  `\`\`\`clojure`,
  `(f/reassess :of :${id}`,
  `  :date      "${today}"`,
  `  :scores    {:<dimension> <1-10>} ;; only the dimensions that changed; omit if none did`,
  `  :rationale "what changed in the context, the verdict, and the argument for it"`,
  `  :status    :<planned|abandoned>) ;; omit for keep`,
  `\`\`\``,
  `Add it to the \`:history\` vector of \`(f/candidate :${id}\`: append it as the last entry if \`:history\` exists, otherwise add \`:history [...]\` on the line after \`:scores\`. Never edit the candidate's own :status or :scores: the history is the record. If you can edit files, insert it once I have confirmed the verdict.`,
];

/** Build the Decide prompt for one candidate. */
export const buildDecidePrompt = ({
  candidate, candidates, charterContent, filePath, formContent, goals, today,
}: DecidePromptInput): string =>
  [
    `Using Conjurer's \`f/reassess\` construct: decide whether this candidate still earns its place in the backlog. This is a verdict, not a review: it must end in a decision.`,
    ``,
    `File: ${filePath}`,
    `Candidate: :${candidate.id}${candidate.label === candidate.id ? '' : `, ${candidate.label}`}`,
    statusLine(candidate, today),
    ``,
    `Form:`,
    `\`\`\`clojure`,
    formContent.trim(),
    `\`\`\``,
    ``,
    `Project :goals (${goals.length}):`,
    ...(goals.length === 0 ? ['  (none)'] : goals.map((g, i) => `${i + 1}. ${oneLine(g)}`)),
    ``,
    `Charter (decisions and constraints; read the whole file if you can):`,
    `\`\`\`clojure`,
    charterContent.trim().slice(0, 3000),
    `\`\`\``,
    ``,
    `Other active candidates (for overlap and relative priority):`,
    ...otherCandidateLines(candidate, candidates),
    ``,
    ...EVALUATION_STEPS,
    ...recordStep(candidate.id, today),
  ].join('\n');

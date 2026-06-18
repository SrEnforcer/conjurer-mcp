import { intoMap } from '@tsfpp/prelude';
import type { CnjCandidateForm } from './cnj-model.js';

/**
 * Merge a candidate's base scores with any reassessment overrides.
 *
 * @param candidate - Candidate with optional reassessment history.
 * @returns Effective score map after replaying reassessments in order.
 */
export const effectiveScores = (candidate: CnjCandidateForm): ReadonlyMap<string, number> =>
  candidate.history.reduce(
    (scores, reassessment) =>
      reassessment.scores.size > 0
        ? intoMap([...scores.entries(), ...reassessment.scores.entries()])
        : scores,
    candidate.scores,
  );
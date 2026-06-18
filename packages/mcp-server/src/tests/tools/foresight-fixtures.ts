import { fromNullable, getOrElse } from '@tsfpp/prelude';
import { vi } from 'vitest';

const CHARTER = '(charter "P" :version "1.0.0" :goals ["g"])';

const withCandidates = (candidates: string): string =>
  `${CHARTER}\n${candidates}`;

const CAND_A = `
(f/candidate :alpha
  :label "Alpha feature"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :proposed
  :scores {:feasibility 8 :elegance 9 :containment 7 :value 9}
  :rationale "High value, low risk. Deferred pending parser work.")`;

const CAND_B = `
(f/candidate :beta
  :label "Beta feature"
  :cluster :cluster-x
  :added "2026-01-15"
  :status :proposed
  :scores {:feasibility 5 :elegance 7 :containment 6 :value 6}
  :rationale "Useful but lower priority."
  :conditions ["alpha is hoisted first"])`;

const CAND_HOISTED = `
(f/candidate :done
  :label "Done feature"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :hoisted
  :scores {:feasibility 9 :elegance 9 :containment 9 :value 9}
  :rationale "Implemented.")`;

const CAND_OTHER_CLUSTER = `
(f/candidate :gamma
  :label "Gamma feature"
  :cluster :cluster-y
  :added "2026-02-01"
  :status :proposed
  :scores {:feasibility 9 :elegance 8 :containment 9 :value 7}
  :rationale "Different cluster.")`;

const CAND_WITH_HISTORY = `
(f/candidate :with-history
  :label "Has reassessment"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :planned
  :scores {:feasibility 8 :elegance 9 :containment 8 :value 9}
  :rationale "High value."
  :history [
    (f/reassess :of :with-history
      :date "2026-03-01"
      :scores {:feasibility 9}
      :rationale "Dependency landed."
      :status :planned)])`;

const CAND_LOW_SCORE = `
(f/candidate :low-score
  :label "Low score candidate"
  :cluster :cluster-x
  :added "2026-01-01"
  :status :proposed
  :scores {:feasibility 3 :elegance 4 :containment 3 :value 4}
  :rationale "Low priority.")`;

const CAND_STALE = `
(f/candidate :stale-one
  :label "Stale candidate"
  :cluster :cluster-x
  :added "2020-01-01"
  :status :proposed
  :scores {:feasibility 6 :elegance 7 :containment 6 :value 7}
  :rationale "Old and unreviewed — definitely stale.")`;

const CAND_THIN = `
(f/candidate :thin-one
  :label "Thin rationale"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 5 :elegance 6 :containment 5 :value 6}
  :rationale "Too short.")`;

const CAND_HIGH_NO_COND = `
(f/candidate :high-no-cond
  :label "High score no conditions"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 8 :elegance 8 :containment 8 :value 8}
  :rationale "Strong candidate with no guard conditions specified.")`;

const CAND_HEALTHY = `
(f/candidate :healthy-one
  :label "Healthy candidate"
  :cluster :cluster-x
  :added "2026-06-01"
  :status :proposed
  :scores {:feasibility 5 :elegance 5 :containment 5 :value 5}
  :rationale "Reasonable rationale text that is long enough."
  :conditions ["dependency X ships first"])`;

const HOIST_VALID = `
(f/hoist :of :healthy-one
  :date "2026-06-05"
  :into "decision/healthy-implemented"
  :outcomes ["shipped"])`;

const HOIST_ORPHAN = `
(f/hoist :of :nonexistent-candidate
  :date "2026-06-05"
  :into "decision/something"
  :outcomes ["done"])`;

const virtualFiles: Readonly<Record<string, string>> = {
  '/vfs/foresight/main.cnj': withCandidates(`${CAND_A}${CAND_B}${CAND_HOISTED}${CAND_OTHER_CLUSTER}`),
  '/vfs/foresight/empty.cnj': CHARTER,
  '/vfs/foresight/planned.cnj': withCandidates(`
(f/candidate :planned-one
  :label "Planned one"
  :cluster :cluster-z
  :added "2026-03-01"
  :status :planned
  :scores {:feasibility 7 :elegance 8 :containment 8 :value 8}
  :rationale "Scheduled.")`),
  '/vfs/foresight/triage.cnj': withCandidates(`${CAND_A}${CAND_LOW_SCORE}${CAND_WITH_HISTORY}`),
  '/vfs/foresight/healthy.cnj': `${CHARTER}\n${CAND_HEALTHY}\n${HOIST_VALID}`,
  '/vfs/foresight/stale.cnj': `${CHARTER}\n${CAND_STALE}`,
  '/vfs/foresight/thin.cnj': `${CHARTER}\n${CAND_THIN}`,
  '/vfs/foresight/high-no-cond.cnj': `${CHARTER}\n${CAND_HIGH_NO_COND}`,
  '/vfs/foresight/orphan-hoist.cnj': `${CHARTER}\n${CAND_HEALTHY}\n${HOIST_ORPHAN}`,
  '/vfs/foresight/all-issues.cnj': `${CHARTER}\n${CAND_STALE}\n${CAND_THIN}\n${CAND_HIGH_NO_COND}\n${HOIST_ORPHAN}`,
};

vi.mock('node:fs', () => ({
  existsSync: (path: string): boolean => Object.prototype.hasOwnProperty.call(virtualFiles, path),
  readFileSync: (path: string): string => getOrElse(() => '')(fromNullable(virtualFiles[path])),
}));
/**
 * Charter freshness: a charter's `:updated` should not trail the dated entries in its own
 * file. Pure — reads only the CnjDocument.
 */

import type { CnjDocument } from './cnj-model.js';
import type { EdnNode } from './edn-parser.js';
import type { Violation } from './validation.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type DatedEntry = { readonly date: string; readonly source: string };

const nodeDate = (n: EdnNode | undefined): string => (n?.type === 'string' ? n.value : '');

const datedEntries = (doc: CnjDocument): ReadonlyArray<DatedEntry> => [
  ...doc.charter.decisions.map((entry, i) => ({ date: nodeDate(entry.get('date')), source: `charter.decisions[${i}]` })),
  ...doc.candidates.map((c) => ({ date: c.added, source: `f/candidate :${c.id} :added` })),
  ...doc.candidates.flatMap((c) => c.history.map((r) => ({ date: r.date, source: `f/reassess :of :${c.id}` }))),
  ...doc.hoists.map((h) => ({ date: h.date, source: `f/hoist :of :${h.of}` })),
];

/**
 * Warn when the charter's `:updated` is earlier than the latest dated entry in the file
 * (a decision, a candidate's `:added`, an `f/reassess` or an `f/hoist`).
 *
 * @param doc - The parsed document.
 * @returns At most one warning; none when `:updated` is absent or not a YYYY-MM-DD date.
 */
export const checkCharterUpdated = (doc: CnjDocument): ReadonlyArray<Violation> => {
  const updated = doc.charter.updated;
  if (!DATE_RE.test(updated)) return [];
  const latest = datedEntries(doc)
    .filter((e) => DATE_RE.test(e.date))
    .reduce<DatedEntry | undefined>((acc, e) => (acc === undefined || e.date > acc.date ? e : acc), undefined);
  return latest !== undefined && latest.date > updated
    ? [{
        rule: 'charter-updated-stale',
        severity: 'warning',
        location: 'charter.updated',
        message: `Charter :updated (${updated}) is earlier than the latest dated entry (${latest.date}, ${latest.source})`,
      }]
    : [];
};

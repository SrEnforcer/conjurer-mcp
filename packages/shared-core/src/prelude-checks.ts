/**
 * Validation rules that follow from the prelude (core grimoire, Part V):
 *
 * - An incantation's `:expands-to` may use prelude forms, its parameters and
 *   registered spells, and nothing else.
 * - A structural `ensure` predicate is mechanically checkable only when it is
 *   written in the prelude; otherwise it is honoured at the `:llm` layer.
 *
 * Both are warnings: spells registered in another file or a practitioner
 * grimoire are not visible from one document.
 */
import { isDefined } from '@tsfpp/prelude';
import type { EdnNode, EdnList } from './edn-parser.js';
import type { Prelude } from './prelude.js';
import { classifyExpression, isCall } from './prelude.js';
import type { Violation } from './validation.js';

const headIs = (form: EdnList, name: string): boolean => {
  const h = form.elements[0];
  return isDefined(h) && h.type === 'symbol' && h.value === name;
};

const nameOf = (form: EdnList): string => {
  const n = form.elements[1];
  return isDefined(n) && n.type === 'symbol' ? n.value : '';
};

/** The value following a keyword among a form's elements. */
const kwArg = (form: EdnList, key: string): EdnNode | undefined => {
  const i = form.elements.findIndex((e) => e.type === 'keyword' && e.value === key);
  return i < 0 ? undefined : form.elements[i + 1];
};

/** Every call form in the tree, outermost first. */
const callForms = (nodes: ReadonlyArray<EdnNode>): ReadonlyArray<EdnList> =>
  nodes.flatMap((n): ReadonlyArray<EdnList> => {
    if (n.type === 'map') return callForms(Array.from(n.entries.values()));
    if (n.type !== 'list') return [];
    return isCall(n) ? [n, ...callForms(n.elements)] : callForms(n.elements);
  });

const paramNames = (form: EdnList): ReadonlyArray<string> => {
  const params = form.elements[2];
  return isDefined(params) && params.type === 'list'
    ? params.elements.flatMap((e) => (e.type === 'symbol' && e.value !== '&' ? [e.value] : []))
    : [];
};

const checkIncantation = (form: EdnList, spells: ReadonlyArray<string>, prelude: Prelude): ReadonlyArray<Violation> => {
  const body = kwArg(form, ':expands-to');
  if (!isDefined(body)) return [];
  const name = nameOf(form);
  const c = classifyExpression(body, prelude, { allowedHeads: [...paramNames(form), ...spells] });
  return c.semanticHeads.map((h) => ({
    rule: 'incantation-expands-to-prelude',
    severity: 'warning',
    location: `incantation:${name.length > 0 ? name : '(unnamed)'}`,
    message: `:expands-to uses '${h.head}' (line ${String(h.line)}), which is neither a prelude form, a parameter nor a spell registered in this file`,
  }));
};

const checkEnsure = (form: EdnList, prelude: Prelude): ReadonlyArray<Violation> => {
  const structural = kwArg(form, ':structural');
  if (!isDefined(structural) || structural.type !== 'list') return [];
  return structural.elements.flatMap((pred) =>
    classifyExpression(pred, prelude).semanticHeads.map((h) => ({
      rule: 'ensure-structural-prelude',
      severity: 'warning',
      location: `ensure (line ${String(form.line)})`,
      message: `Structural predicate uses '${h.head}', which is not in the prelude; it is honoured at the :llm layer, not checked mechanically`,
    })),
  );
};

/**
 * Check a parsed .cnj against the rules that follow from the prelude.
 *
 * @param ast - Top-level forms of the document.
 * @param prelude - The prelude in force.
 * @returns Warnings for non-prelude heads in incantation expansions and structural ensure predicates.
 */
export const checkPreludeUsage = (ast: ReadonlyArray<EdnNode>, prelude: Prelude): ReadonlyArray<Violation> => {
  const forms = callForms(ast);
  const spells = forms.filter((f) => headIs(f, 'spell')).map(nameOf).filter((n) => n.length > 0);
  return [
    ...forms.filter((f) => headIs(f, 'incantation')).flatMap((f) => checkIncantation(f, spells, prelude)),
    ...forms.filter((f) => headIs(f, 'ensure')).flatMap((f) => checkEnsure(f, prelude)),
  ];
};

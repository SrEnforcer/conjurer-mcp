/**
 * Migration warnings for forms the Conjurer specification retired in October 2026.
 *
 * Each rule names the old form, the current one, and where the change is recorded, so an
 * authored `.cnj` can be brought up to date in one pass. Warnings only. Pure — no I/O.
 */
import type { EdnNode, EdnList } from './edn-parser.js';
import type { Violation } from './validation.js';

type Rule = {
  readonly id: string;
  readonly applies: (call: EdnList) => boolean;
  readonly message: string;
};

const headOf = (call: EdnList): string => {
  const head = call.elements[0];
  return head !== undefined && head.type === 'symbol' ? head.value : '';
};

const isKeyword = (node: EdnNode | undefined, name: string): boolean =>
  node !== undefined && node.type === 'keyword' && node.value === `:${name}`;

/** The value following a keyword at the top level of a call, if any. */
const valueAfter = (call: EdnList, key: string): EdnNode | undefined => {
  const i = call.elements.findIndex((el) => isKeyword(el, key));
  return i >= 0 ? call.elements[i + 1] : undefined;
};

const followedBy = (call: EdnList, key: string, next: string): boolean => isKeyword(valueAfter(call, key), next);

const RULES: ReadonlyArray<Rule> = [
  {
    id: 'deprecated-map-cases',
    applies: (c): boolean => headOf(c) === 'branch' && valueAfter(c, 'cases')?.type === 'map',
    message: 'branch :cases is a vector of pattern–operation pairs tried in order, not a map (core.md · branch; CHANGELOG Unreleased)',
  },
  {
    id: 'deprecated-map-recover',
    applies: (c): boolean => headOf(c) === 'ward' && valueAfter(c, 'recover')?.type === 'map',
    message: 'ward :recover is a vector of pattern–operation pairs tried in order, not a map (core.md · ward)',
  },
  {
    id: 'deprecated-escalate-when',
    applies: (c): boolean => followedBy(c, 'escalate', 'when'),
    message: ':escalate :when p is now :escalate-when p — parameters come in pairs (template.md · Form shape)',
  },
  {
    id: 'deprecated-deepen-by',
    applies: (c): boolean => followedBy(c, 'deepen', 'by'),
    message: ':deepen :by n is now :deepen n — parameters come in pairs (template.md · Form shape)',
  },
  {
    id: 'deprecated-confidence-grade-each',
    applies: (c): boolean => followedBy(c, 'confidence', 'grade-each'),
    message: ':confidence :grade-each is now :grade :each — :confidence is never an instruction (core.md · Confidence)',
  },
  {
    id: 'deprecated-style-confidence',
    applies: (c): boolean => {
      const style = valueAfter(c, 'style');
      return headOf(c) === 'a/define' && style?.type === 'map' && style.entries.has('confidence');
    },
    message: 'a/define :style {:confidence ...} is now :style {:disposition ...} (core.md · Confidence)',
  },
  {
    id: 'deprecated-context-establish',
    applies: (c): boolean => headOf(c) === 'context' && c.elements[1]?.type === 'symbol' && c.elements[1].value === 'establish',
    message: '(context establish name ...) is (context name ...) — context takes only a name',
  },
  {
    id: 'deprecated-reference-prefix',
    applies: (c): boolean => {
      const into = valueAfter(c, 'into');
      return headOf(c) === 'f/hoist' && into?.type === 'keyword' && into.value.startsWith(':charter-decision/');
    },
    message: ':charter-decision/<id> is now :decision/<id> (core.md · Names and references)',
  },
];

const callsIn = (node: EdnNode): ReadonlyArray<EdnList> => {
  if (node.type === 'map') return Array.from(node.entries.values()).flatMap(callsIn);
  if (node.type !== 'list') return [];
  const nested = node.elements.flatMap(callsIn);
  return node.delimiter === undefined && node.elements.length > 0 ? [node, ...nested] : nested;
};

/**
 * Warn about retired forms anywhere in a file.
 *
 * @param forms - Top-level forms of a `.cnj` file.
 * @returns One warning per retired form, located by line.
 */
export const lintRetiredForms = (forms: ReadonlyArray<EdnNode>): ReadonlyArray<Violation> =>
  forms.flatMap(callsIn).flatMap((call) =>
    RULES.filter((rule) => rule.applies(call)).map((rule) => ({
      rule: rule.id,
      severity: 'warning' as const,
      location: `line ${call.line}`,
      message: rule.message,
    })));

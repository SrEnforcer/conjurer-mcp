/**
 * Expression tool over the prelude (core grimoire, Part V): classify an
 * expression as prelude or semantic, and evaluate it when it is prelude.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { parse, classifyExpression, evaluateExpression, printValue } from '@conjurer/core';
import type { EdnNode, Prelude, SymbolIndex, Bindings } from '@conjurer/core';
import { ok, err, isErr, isDefined, intoMap } from '@tsfpp/prelude';
import type { Result } from '@tsfpp/prelude';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

const toContent = (text: string): ToolContent => [{ type: 'text', text }];
const toJson = (value: unknown): ToolContent => toContent(JSON.stringify(value, null, 2));

export type ExpressionContext = {
  readonly index: SymbolIndex;
};

export type CheckExpressionInput = {
  readonly expression: string;
  readonly bindings?: string;
  readonly allowedHeads?: ReadonlyArray<string>;
};

const NO_PRELUDE =
  "The spec's index.edn declares no :prelude (catalogue before 2.0.0); nothing can be classified.";

const parseOne = (src: string): Result<EdnNode, string> => {
  const r = parse(src);
  if (isErr(r)) return err(`Parse error: ${r.error.message}`);
  const [first, ...rest] = r.value;
  return isDefined(first) && rest.length === 0 ? ok(first) : err('expression must be exactly one form');
};

const parseBindings = (src: string | undefined): Result<Bindings, string> => {
  if (!isDefined(src) || src.trim().length === 0) return ok(intoMap([]));
  const r = parseOne(src);
  if (isErr(r)) return err(`bindings: ${r.error}`);
  return r.value.type === 'map' ? ok(r.value.entries) : err('bindings must be an EDN map, e.g. {daily-limit (eur 5000)}');
};

const evaluation = (node: EdnNode, prelude: Prelude, bindings: Bindings): Readonly<Record<string, unknown>> => {
  const r = evaluateExpression(node, prelude, bindings);
  return isErr(r)
    ? { status: r.error.kind, message: r.error.message, line: r.error.line, column: r.error.column }
    : { status: 'value', value: printValue(r.value) };
};

/**
 * Classify an expression against the prelude and evaluate it with the given bindings.
 *
 * @param input - The expression, optional EDN bindings, and heads that count as deterministic here.
 * @param prelude - The spec's prelude, absent for a catalogue before 2.0.0.
 * @returns Tool text content payload (JSON).
 */
export const handleCheckExpression = (input: CheckExpressionInput, prelude: Prelude | undefined): ToolContent => {
  if (!isDefined(prelude)) return toJson({ prelude_available: false, message: NO_PRELUDE });
  const node = parseOne(input.expression);
  if (isErr(node)) return toJson({ prelude_available: true, error: node.error });
  const bindings = parseBindings(input.bindings);
  if (isErr(bindings)) return toJson({ prelude_available: true, error: bindings.error });
  const c = classifyExpression(node.value, prelude, { allowedHeads: input.allowedHeads ?? [] });
  return toJson({
    prelude_available: true,
    deterministic: c.deterministic,
    semantic_heads: c.semanticHeads,
    free_variables: c.freeVariables,
    evaluation: evaluation(node.value, prelude, bindings.value),
  });
};

export const registerExpressionTools = (server: McpServer, ctx: ExpressionContext): void => {
  server.registerTool('check_expression', {
    description:
      'Classify a Conjurer expression against the spec prelude (core Part V): which heads are ' +
      'prelude forms and which are semantic functions for the model. Evaluates predicates, unit ' +
      'forms and keyword access against optional EDN bindings; never guesses at a semantic head.',
    inputSchema: {
      expression: z.string().describe('One EDN form, e.g. "(<= daily-limit (eur 10000))"'),
      bindings: z.string().optional().describe('EDN map of free variables, e.g. "{daily-limit (eur 5000)}"'),
      allowed_heads: z.array(z.string()).optional().describe(
        'Heads that count as deterministic here, e.g. an incantation\'s parameters and registered spells',
      ),
    },
  }, ({ expression, bindings, allowed_heads }) => ({
    content: [...handleCheckExpression(
      { expression, ...(isDefined(bindings) ? { bindings } : {}), ...(isDefined(allowed_heads) ? { allowedHeads: allowed_heads } : {}) },
      ctx.index.prelude,
    )],
  }));
};

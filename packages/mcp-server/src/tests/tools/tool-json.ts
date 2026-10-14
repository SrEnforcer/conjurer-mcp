import type { z } from 'zod';

type ToolResponseItem = Readonly<{ readonly text: string | undefined }>;

/**
 * Parses the first text payload of an MCP tool response and validates it against a schema.
 * A missing payload or one that does not match the schema fails the calling test.
 *
 * Schemas name only the fields a spec reads; use `z.looseObject` so other fields survive
 * for assertions over the whole payload.
 *
 * @param response Tool response content array.
 * @param schema Shape the payload must have.
 * @returns The payload, typed by the schema.
 */
export const parseToolJson = <S extends z.ZodType>(
  response: ReadonlyArray<ToolResponseItem>,
  schema: S,
): z.output<S> => schema.parse(JSON.parse(response[0]?.text ?? 'null'));

import { fromNullable, getOrElseOption } from '@tsfpp/prelude';

type ToolResponseItem = Readonly<{ readonly text: string | undefined }>;

/**
 * Parses JSON from the first text payload returned by an MCP tool.
 *
 * @param response Tool response content array.
 * @param fallbackJson JSON string used when the text payload is missing.
 * @returns Parsed JSON value.
 */
export const parseFirstToolText = (
  response: ReadonlyArray<ToolResponseItem>,
  fallbackJson: string,
): ReturnType<typeof JSON.parse> =>
  JSON.parse(getOrElseOption(() => fallbackJson)(fromNullable(response[0]?.text)));

/**
 * Parses an object payload from the first tool text entry.
 *
 * @param response Tool response content array.
 * @returns Parsed object payload, or an empty object fallback.
 */
export const parseFirstToolObject = (
  response: ReadonlyArray<ToolResponseItem>,
): ReturnType<typeof JSON.parse> => parseFirstToolText(response, '{}');

/**
 * Parses an array payload from the first tool text entry.
 *
 * @param response Tool response content array.
 * @returns Parsed array payload, or an empty array fallback.
 */
export const parseFirstToolArray = (
  response: ReadonlyArray<ToolResponseItem>,
): ReturnType<typeof JSON.parse> => parseFirstToolText(response, '[]');
/**
 * The boundary between a tool handler and the MCP transport.
 */
import { tryCatch, match } from '@tsfpp/prelude';
import { describeThrown } from '@conjurer/core';
import { logError } from '../logging.js';

type ToolContent = ReadonlyArray<{ readonly type: 'text'; readonly text: string }>;

/**
 * Run a tool handler so that an unexpected exception becomes a tool result naming its input,
 * instead of escaping to the transport without saying which file caused it.
 *
 * @param subject - What the handler was given, such as a file path, for the message.
 * @param run - The handler call.
 * @returns The handler's content, or one text item describing the failure.
 */
export const guarded = (subject: string, run: () => ToolContent): ToolContent =>
  match(
    (message: string): ToolContent => {
      logError(`Unexpected error while handling ${subject}`, message);
      return [{ type: 'text', text: `Unexpected error while handling ${subject}: ${message}` }];
    },
    (content: ToolContent): ToolContent => content,
  )(tryCatch(run, describeThrown));

/**
 * Structured stderr logging for MCP server adapter boundaries.
 *
 * This module is the only writer for JSON log records to stderr so protocol
 * stdout remains clean for MCP transport frames.
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogEntry = {
  readonly level: LogLevel;
  readonly message: string;
};

/**
 * Emit a structured log entry without payload data.
 *
 * @param level - Severity level.
 * @param message - Human-readable message.
 * @returns No return value.
 */
export const log = (level: LogLevel, message: string): void => {
  const entry: LogEntry = { level, message };
  process.stderr.write(JSON.stringify(entry) + '\n');
};

/**
 * Emit a structured log entry with payload data.
 *
 * @param level - Severity level.
 * @param message - Human-readable message.
 * @param data - Additional structured payload.
 * @returns No return value.
 */
export const logWithData = (level: LogLevel, message: string, data: unknown): void => {
  process.stderr.write(JSON.stringify({ level, message, data }) + '\n');
};

/**
 * Emit an error log with payload details.
 *
 * @param message - Human-readable message.
 * @param error - Captured error payload.
 * @returns No return value.
 */
export const logError = (message: string, error: unknown): void => {
  logWithData('error', message, error);
};

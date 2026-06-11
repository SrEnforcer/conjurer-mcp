/**
 * Emit a structured log entry without payload data.
 *
 * @param level - Severity level.
 * @param message - Human-readable message.
 * @returns No return value.
 */
export const log = (level, message) => {
    const entry = { level, message };
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
export const logWithData = (level, message, data) => {
    process.stderr.write(JSON.stringify({ level, message, data }) + '\n');
};
/**
 * Emit an error log with payload details.
 *
 * @param message - Human-readable message.
 * @param error - Captured error payload.
 * @returns No return value.
 */
export const logError = (message, error) => {
    logWithData('error', message, error);
};

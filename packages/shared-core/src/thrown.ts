/**
 * Text for a value caught at an adapter boundary, where anything may have been thrown.
 *
 * @param e - The caught value.
 * @returns Its `message` when it has one, otherwise its string form.
 */
export const describeThrown = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string' ? e.message : String(e);

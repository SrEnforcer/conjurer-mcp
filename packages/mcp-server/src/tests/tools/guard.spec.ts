import { describe, it, expect, vi } from 'vitest';
import { guarded } from '../../tools/guard.js';

vi.mock('../../logging.js', () => ({ logError: (): void => undefined }));

// Exhausts the stack for real: the RangeError a per-character recursion used to raise.
const overflow = (n: number): number => overflow(n + 1) + 1;

describe('guarded', () => {
  it('passes the handler content through', () => {
    expect(guarded('a.cnj', () => [{ type: 'text', text: 'ok' }])).toEqual([{ type: 'text', text: 'ok' }]);
  });

  it('turns an exception into a tool result naming the subject', () => {
    const r = guarded('design/api.cnj', () => [{ type: 'text', text: String(overflow(0)) }]);
    expect(r).toEqual([{ type: 'text', text: 'Unexpected error while handling design/api.cnj: Maximum call stack size exceeded' }]);
  });

  it('describes a thrown value that is not an Error', () => {
    // eslint-disable-next-line functional/no-throw-statements -- the guard must cope with any thrown value, not only an Error
    const r = guarded('x.cnj', () => { throw 'boom'; });
    expect(r[0]?.text).toBe('Unexpected error while handling x.cnj: boom');
  });
});

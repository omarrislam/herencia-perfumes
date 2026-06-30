import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt';

describe('jwt', () => {
  it('round-trips a payload', () => {
    const t = signToken({ sub: 'abc', role: 'admin' });
    expect(verifyToken(t)).toMatchObject({ sub: 'abc', role: 'admin' });
  });
  it('returns null for garbage', () => {
    expect(verifyToken('not.a.token')).toBeNull();
  });
});

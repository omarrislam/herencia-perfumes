import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './jwt';

describe('jwt', () => {
  it('round-trips a payload', () => {
    const t = signToken({ sub: 'abc', role: 'admin' });
    expect(verifyToken(t)).toMatchObject({ sub: 'abc', role: 'admin' });
  });
  it('returns null for garbage', () => {
    expect(verifyToken('not.a.token')).toBeNull();
  });
  it('returns null for a token with an invalid role', () => {
    const bad = jwt.sign({ sub: 'abc', role: 'superadmin' }, process.env.JWT_SECRET as string, { algorithm: 'HS256' });
    expect(verifyToken(bad)).toBeNull();
  });
});

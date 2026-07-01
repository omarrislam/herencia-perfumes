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
  it('returns null for an expired token (M2-min-6)', () => {
    const expired = jwt.sign(
      { sub: 'u1', role: 'customer' },
      process.env.JWT_SECRET as string,
      { algorithm: 'HS256', expiresIn: -10 },
    );
    expect(verifyToken(expired)).toBeNull();
  });
  it('returns null for a tampered token signature (M2-min-6)', () => {
    const t = signToken({ sub: 'u1', role: 'customer' });
    const tampered = t.slice(0, -4) + 'xxxx';
    expect(verifyToken(tampered)).toBeNull();
  });
});

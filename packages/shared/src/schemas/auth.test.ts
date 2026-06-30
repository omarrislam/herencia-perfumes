import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth';

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse({ name: 'Mai', email: 'mai@x.com', password: 'secret12' }).success).toBe(true);
  });
  it('rejects a short password', () => {
    expect(registerSchema.safeParse({ name: 'Mai', email: 'mai@x.com', password: 'short' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'secret12' }).success).toBe(false);
  });
});

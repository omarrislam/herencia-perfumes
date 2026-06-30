import { describe, it, expect } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  const base = {
    NODE_ENV: 'test',
    PORT: '4000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/herencia',
    JWT_SECRET: 'x'.repeat(16),
    CLIENT_ORIGIN: 'http://localhost:5173',
    ADMIN_TOKEN: 'y'.repeat(16),
  };

  it('parses a valid env and coerces PORT to number', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.MONGODB_URI).toContain('mongodb://');
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short' })).toThrow();
  });

  it('throws when ADMIN_TOKEN is too short', () => {
    expect(() => loadEnv({ ...base, ADMIN_TOKEN: 'short' })).toThrow();
  });
});

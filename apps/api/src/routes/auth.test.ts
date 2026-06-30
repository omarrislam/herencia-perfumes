import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function register(email = 'mai@x.com') {
  return request(app).post('/api/auth/register').send({ name: 'Mai', email, password: 'secret12' });
}

describe('POST /api/auth/register', () => {
  it('creates a user, sets a cookie, returns the user DTO', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Mai', email: 'mai@x.com', role: 'customer' });
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=/);
  });
  it('rejects a duplicate email with 409', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'mai@x.com', password: 'secret12' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=/);
  });
  it('rejects a wrong password with 401', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'mai@x.com', password: 'wrong123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when unauthenticated', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
  it('returns the current user with the cookie', async () => {
    const reg = await register();
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('mai@x.com');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=;/);
  });
});

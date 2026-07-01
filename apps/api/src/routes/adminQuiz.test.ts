import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const valid = { order: 1, question: 'Day or night?', answers: [{ label: 'Day', weights: { value: 1 } }, { label: 'Night', weights: { value: 2 } }] };

describe('admin quiz', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/quiz').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates, returns weights to admin, lists, updates, deletes', async () => {
    const c = await request(app).post('/api/admin/quiz').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    expect(c.body.answers[1].weights.value).toBe(2);
    const id = c.body.id;
    const list = await request(app).get('/api/admin/quiz').set('Cookie', ADMIN);
    expect(list.body).toHaveLength(1);
    const u = await request(app).put(`/api/admin/quiz/${id}`).set('Cookie', ADMIN).send({ ...valid, question: 'Updated?' });
    expect(u.body.question).toBe('Updated?');
    const d = await request(app).delete(`/api/admin/quiz/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('rejects a question with one answer (400)', async () => {
    const res = await request(app).post('/api/admin/quiz').set('Cookie', ADMIN).send({ order: 1, question: 'q', answers: [{ label: 'only', weights: { value: 1 } }] });
    expect(res.status).toBe(400);
  });
});

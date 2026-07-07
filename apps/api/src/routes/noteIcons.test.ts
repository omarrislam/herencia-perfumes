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

describe('note icons', () => {
  it('403s a customer creating an icon', async () => {
    const res = await request(app)
      .post('/api/admin/notes')
      .set('Cookie', authCookie('000000000000000000000002', 'customer'))
      .send({ name: 'Oud', image: 'herencia/oud' });
    expect(res.status).toBe(403);
  });

  it('admin creates (upsert by name, case-insensitive) and the public list serves it', async () => {
    const created = await request(app)
      .post('/api/admin/notes')
      .set('Cookie', ADMIN)
      .send({ name: 'Blue Lotus', image: 'herencia/lotus-v1' })
      .expect(201);
    expect(created.body).toMatchObject({ name: 'blue lotus', image: 'herencia/lotus-v1' });

    // Re-uploading the same name replaces the image instead of duplicating.
    await request(app)
      .post('/api/admin/notes')
      .set('Cookie', ADMIN)
      .send({ name: 'BLUE LOTUS', image: 'herencia/lotus-v2' })
      .expect(201);

    const pub = await request(app).get('/api/notes').expect(200);
    expect(pub.body).toHaveLength(1);
    expect(pub.body[0]).toMatchObject({ name: 'blue lotus', image: 'herencia/lotus-v2' });
  });

  it('admin deletes an icon', async () => {
    const created = await request(app)
      .post('/api/admin/notes')
      .set('Cookie', ADMIN)
      .send({ name: 'Fig', image: 'herencia/fig' })
      .expect(201);
    await request(app).delete(`/api/admin/notes/${created.body.id}`).set('Cookie', ADMIN).expect(204);
    const pub = await request(app).get('/api/notes').expect(200);
    expect(pub.body).toHaveLength(0);
  });
});

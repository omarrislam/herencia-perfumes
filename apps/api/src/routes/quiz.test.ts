import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { QuizQuestion } from '../models/QuizQuestion';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);

let woodyId: string;
let q1Id: string;
beforeEach(async () => {
  await clearDb();
  const woody = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  woodyId = String(woody._id);
  await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  const q = await QuizQuestion.create({
    order: 1, question: 'Pick a vibe',
    answers: [{ label: 'Warm woods', weights: { scentFamily: woody._id, value: 3 } }, { label: 'Fresh', weights: { value: 1 } }],
  });
  q1Id = String(q._id);
});

describe('GET /api/quiz', () => {
  it('returns questions with labels but NOT weights', async () => {
    const res = await request(app).get('/api/quiz');
    expect(res.status).toBe(200);
    expect(res.body[0].answers[0].label).toBe('Warm woods');
    expect(res.body[0].answers[0].weights).toBeUndefined();
  });
});

describe('POST /api/quiz/result', () => {
  it('recommends products from the accumulated scent-family weight', async () => {
    const res = await request(app).post('/api/quiz/result').send({ selections: [{ questionId: q1Id, answerIndex: 0 }] });
    expect(res.status).toBe(200);
    expect(res.body.scentFamily.id).toBe(woodyId);
    expect(res.body.recommended.length).toBeGreaterThan(0);
    expect(res.body.recommended[0].name).toBe('Royal Oud');
  });
  it('400s on a malformed selection', async () => {
    expect((await request(app).post('/api/quiz/result').send({ selections: [{ questionId: 'x', answerIndex: 0 }] })).status).toBe(400);
  });
});

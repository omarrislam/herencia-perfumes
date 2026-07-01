import { describe, it, expect } from 'vitest';
import { quizQuestionSchema, quizResultSchema } from './quiz';

const oid = 'a'.repeat(24);

describe('quiz schemas', () => {
  it('accepts a valid admin question with weights', () => {
    expect(quizQuestionSchema.safeParse({
      order: 1, question: 'Day or night?',
      answers: [{ label: 'Day', weights: { gender: 'unisex', value: 2 } }, { label: 'Night', weights: { scentFamily: oid, value: 3 } }],
    }).success).toBe(true);
  });
  it('requires at least two answers', () => {
    expect(quizQuestionSchema.safeParse({ order: 1, question: 'q', answers: [{ label: 'only', weights: { value: 1 } }] }).success).toBe(false);
  });
  it('validates a result request', () => {
    expect(quizResultSchema.safeParse({ selections: [{ questionId: oid, answerIndex: 0 }] }).success).toBe(true);
    expect(quizResultSchema.safeParse({ selections: [{ questionId: 'x', answerIndex: 0 }] }).success).toBe(false);
  });
});

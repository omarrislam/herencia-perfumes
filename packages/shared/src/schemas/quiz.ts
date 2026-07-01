import { z } from 'zod';
import { GENDER } from '../enums';
import type { ScentFamilyDTO, ProductDTO } from './catalog';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

const quizAnswerSchema = z.object({
  label: z.string().trim().min(1).max(120),
  weights: z.object({
    scentFamily: objectId.optional(),
    gender: z.enum(GENDER).optional(),
    value: z.number().int().min(0).max(10).default(1),
  }),
});

export const quizQuestionSchema = z.object({
  order: z.number().int().min(0).default(0),
  question: z.string().trim().min(1).max(200),
  answers: z.array(quizAnswerSchema).min(2).max(8),
});
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

export const quizResultSchema = z.object({
  selections: z
    .array(z.object({ questionId: objectId, answerIndex: z.number().int().min(0) }))
    .min(1),
});
export type QuizResultInput = z.infer<typeof quizResultSchema>;

export type QuizAnswerPublicDTO = { label: string };
export type QuizQuestionPublicDTO = { id: string; order: number; question: string; answers: QuizAnswerPublicDTO[] };
export type QuizQuestionAdminDTO = {
  id: string;
  order: number;
  question: string;
  answers: { label: string; weights: { scentFamily?: string; gender?: string; value: number } }[];
};
export type QuizResultDTO = { scentFamily: ScentFamilyDTO | null; gender: string | null; recommended: ProductDTO[] };

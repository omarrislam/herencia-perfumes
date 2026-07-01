import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { GENDER } from '@herencia/shared';

const answerSchema = new Schema(
  {
    label: { type: String, required: true },
    weights: {
      scentFamily: { type: Schema.Types.ObjectId, ref: 'ScentFamily' },
      gender: { type: String, enum: [...GENDER] },
      value: { type: Number, default: 1, min: 0 },
    },
  },
  { _id: false },
);

const quizQuestionSchema = new Schema(
  {
    order: { type: Number, default: 0, index: true },
    question: { type: String, required: true },
    answers: { type: [answerSchema], required: true },
  },
  { timestamps: true },
);

export type QuizQuestionDoc = InferSchemaType<typeof quizQuestionSchema>;
export const QuizQuestion =
  (mongoose.models.QuizQuestion as mongoose.Model<QuizQuestionDoc>) ?? mongoose.model('QuizQuestion', quizQuestionSchema);

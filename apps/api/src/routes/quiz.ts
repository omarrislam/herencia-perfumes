import { Router } from 'express';
import { quizResultSchema } from '@herencia/shared';
import { QuizQuestion } from '../models/QuizQuestion';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { HttpError } from '../middleware/error';
import { toQuizQuestionPublicDTO, toProductDTO, toScentFamilyDTO } from '../lib/serialize';

export function quizRouter(): Router {
  const router = Router();

  router.get('/quiz', async (_req, res, next) => {
    try {
      const docs = await QuizQuestion.find().sort({ order: 1 }).lean();
      res.json(docs.map(toQuizQuestionPublicDTO));
    } catch (err) {
      next(err);
    }
  });

  router.post('/quiz/result', async (req, res, next) => {
    try {
      const parsed = quizResultSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const questions = await QuizQuestion.find().lean();
      const byId = new Map(questions.map((q) => [String(q._id), q]));

      const familyScore = new Map<string, number>();
      const genderScore = new Map<string, number>();
      for (const sel of parsed.data.selections) {
        const q = byId.get(sel.questionId);
        const answer = q?.answers?.[sel.answerIndex];
        if (!answer) continue;
        const value = answer.weights?.value ?? 1;
        const wScentFamily = answer.weights?.scentFamily;
        const wGender = answer.weights?.gender;
        if (wScentFamily) familyScore.set(String(wScentFamily), (familyScore.get(String(wScentFamily)) ?? 0) + value);
        if (wGender) genderScore.set(String(wGender), (genderScore.get(String(wGender)) ?? 0) + value);
      }

      const topFamily = [...familyScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const topGender = [...genderScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

      const filter: Record<string, unknown> = { isActive: true, type: 'perfume' };
      if (topFamily) filter['scentFamily'] = topFamily;
      if (topGender) filter['gender'] = topGender;
      let products = await Product.find(filter).limit(4).populate('scentFamily').lean();
      if (products.length === 0) {
        products = await Product.find({ isActive: true, type: 'perfume' }).sort({ 'rating.avg': -1 }).limit(4).populate('scentFamily').lean();
      }
      const family = topFamily ? await ScentFamily.findById(topFamily).lean() : null;

      res.json({
        scentFamily: family ? toScentFamilyDTO(family) : null,
        gender: topGender ?? null,
        recommended: products.map((p) => toProductDTO(p)),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

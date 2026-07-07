import { Router } from 'express';
import { NoteIcon } from '../models/NoteIcon';
import { toNoteIconDTO } from '../lib/serialize';

export const noteIconRouter = Router();

// Public list of admin-uploaded note icons (storefront merges them with the
// built-in static library by note name).
noteIconRouter.get('/notes', async (_req, res, next) => {
  try {
    const docs = await NoteIcon.find().sort({ name: 1 }).lean();
    res.json(docs.map(toNoteIconDTO));
  } catch (err) {
    next(err);
  }
});

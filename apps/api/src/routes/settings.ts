import { Router } from 'express';
import { Setting } from '../models/Setting';
import { HttpError } from '../middleware/error';
import { toSettingDTO } from '../lib/serialize';

export const settingsRouter = Router();

settingsRouter.get('/settings', async (_req, res, next) => {
  try {
    const s = await Setting.findOne().lean();
    if (!s) throw new HttpError(404, 'Settings not configured', 'not_found');
    res.json(toSettingDTO(s));
  } catch (err) {
    next(err);
  }
});

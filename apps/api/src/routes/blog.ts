import { Router } from 'express';
import { BlogPost } from '../models/BlogPost';
import { HttpError } from '../middleware/error';
import { toBlogPostDTO, toBlogListItemDTO } from '../lib/serialize';

export function blogRouter(): Router {
  const router = Router();

  router.get('/blog', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(24, Math.max(1, Number(req.query['limit'] ?? 9) || 9));
      const filter: Record<string, unknown> = { isPublished: true };
      const tag = req.query['tag'];
      if (typeof tag === 'string' && tag) filter['tags'] = tag;
      const [docs, total] = await Promise.all([
        BlogPost.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        BlogPost.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toBlogListItemDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.get('/blog/:slug', async (req, res, next) => {
    try {
      const doc = await BlogPost.findOne({ slug: req.params['slug'], isPublished: true }).lean();
      if (!doc) throw new HttpError(404, 'Post not found', 'not_found');
      res.json(toBlogPostDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '@herencia/shared';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { signToken } from '../lib/jwt';
import { setAuthCookie, clearAuthCookie } from '../lib/authCookie';
import { authenticate, requireAuth } from '../middleware/auth';
import { toUserDTO } from '../lib/serialize';
import { authLimiter } from '../middleware/rateLimit';

export function authRouter(): Router {
  const router = Router();

  router.post('/register', authLimiter, async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { name, email, password } = parsed.data;
      if (await User.exists({ email })) throw new HttpError(409, 'Email already registered', 'conflict');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash, role: 'customer' });
      setAuthCookie(res, signToken({ sub: String(user._id), role: 'customer' }));
      res.status(201).json(toUserDTO(user.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', authLimiter, async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { email, password } = parsed.data;
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new HttpError(401, 'Invalid email or password', 'invalid_credentials');
      }
      setAuthCookie(res, signToken({ sub: String(user._id), role: user.role as 'customer' | 'admin' }));
      res.json(toUserDTO(user.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', authenticate, requireAuth, async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

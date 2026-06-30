import { Router } from 'express';
import { updateProfileSchema, addressSchema, wishlistItemSchema } from '@herencia/shared';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { toUserDTO, toAddressDTO, toProductDTO } from '../lib/serialize';

export function accountRouter(): Router {
  const router = Router();
  router.use(authenticate, requireAuth);

  router.get('/profile', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  router.put('/profile', async (req, res, next) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findByIdAndUpdate(req.user!.id, parsed.data, { new: true }).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  const listAddresses = async (userId: string) => {
    const user = await User.findById(userId).lean();
    return (user?.addresses ?? []).map(toAddressDTO);
  };

  router.get('/addresses', async (req, res, next) => {
    try {
      res.json(await listAddresses(req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/addresses', async (req, res, next) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      if (parsed.data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
      user.addresses.push(parsed.data);
      await user.save();
      const created = user.addresses[user.addresses.length - 1]!;
      res.status(201).json(toAddressDTO(created));
    } catch (err) {
      next(err);
    }
  });

  router.put('/addresses/:id', async (req, res, next) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      const addr = user.addresses.id(req.params['id']);
      if (!addr) throw new HttpError(404, 'Address not found', 'not_found');
      if (parsed.data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
      addr.set(parsed.data);
      await user.save();
      res.json(user.addresses.map(toAddressDTO));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/addresses/:id', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      const addr = user.addresses.id(req.params['id']);
      if (addr) addr.deleteOne();
      await user.save();
      res.json(user.addresses.map(toAddressDTO));
    } catch (err) {
      next(err);
    }
  });

  router.get('/wishlist', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).populate({ path: 'wishlist', populate: { path: 'scentFamily' } }).lean();
      res.json((user?.wishlist ?? []).map((p: unknown) => toProductDTO(p as Record<string, unknown>)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/wishlist', async (req, res, next) => {
    try {
      const parsed = wishlistItemSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      await User.updateOne({ _id: req.user!.id }, { $addToSet: { wishlist: parsed.data.productId } });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/wishlist/:productId', async (req, res, next) => {
    try {
      await User.updateOne({ _id: req.user!.id }, { $pull: { wishlist: req.params['productId'] } });
      const user = await User.findById(req.user!.id).populate({ path: 'wishlist', populate: { path: 'scentFamily' } }).lean();
      res.json((user?.wishlist ?? []).map((p: unknown) => toProductDTO(p as Record<string, unknown>)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

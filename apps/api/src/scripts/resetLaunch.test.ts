import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { resetLaunchData } from './resetLaunch';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Review } from '../models/Review';
import { Subscriber } from '../models/Subscriber';
import { DiscountCode } from '../models/DiscountCode';
import { Product } from '../models/Product';
import { Setting } from '../models/Setting';
import { ScentFamily } from '../models/ScentFamily';
import { QuizQuestion } from '../models/QuizQuestion';
import { Banner } from '../models/Banner';
import { BlogPost } from '../models/BlogPost';
import { User } from '../models/User';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

// Builds one document in every collection the script could plausibly touch, so the
// selectivity assertions below are meaningful rather than vacuous.
async function seedFixture() {
  const family = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const product = await Product.create({
    name: 'Ashes',
    slug: 'ashes',
    type: 'perfume',
    shortDesc: 'x',
    description: 'x',
    images: ['img'],
    sizes: [{ label: '50ml', price: 500, stock: 14 }],
    scentFamily: family._id,
    gender: 'unisex',
    concentration: 'EDP',
    rating: { avg: 4.8, count: 31 },
    sampleStock: 49,
  });
  const user = await User.create({ name: 'Mai', email: 'mai@example.com', passwordHash: 'x', role: 'customer' });
  const admin = await User.create({ name: 'Admin', email: 'admin@herencia.example', passwordHash: 'x', role: 'admin' });

  await Order.create({
    orderNumber: 'HRC-TEST-0001',
    customer: { name: 'Mai', phone: '01012345678' },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
    items: [{ product: product._id, name: 'Ashes', sizeLabel: '50ml', unitPrice: 500, qty: 1 }],
    subtotal: 500,
    shipping: 60,
    total: 560,
    paymentMethod: 'cod',
    status: 'pending',
  });
  await Cart.create({ user: user._id, items: [{ product: product._id, sizeLabel: '50ml', qty: 1 }] });
  await Review.create({ product: product._id, user: user._id, rating: 5, body: 'great', isApproved: true });
  await Subscriber.create({ email: 'sub@example.com' });
  await DiscountCode.create({ code: 'LAUNCH15', percent: 15, uses: 7 });
  await Setting.create({
    whatsappNumber: '+201000000000',
    shippingFee: 60,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  await QuizQuestion.create({ order: 1, question: 'q', answers: [{ label: 'a', weights: {} }] });
  await Banner.create({ placement: 'home_strip', title: 'b', image: 'img', isActive: true });
  await BlogPost.create({ title: 'p', slug: 'p', excerpt: 'e', body: 'b', coverImage: 'c', isPublished: true });

  return { product, user, admin };
}

describe('resetLaunchData — dry run', () => {
  it('reports what would be removed and changes nothing', async () => {
    await seedFixture();

    const report = await resetLaunchData({ dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.counts).toMatchObject({
      orders: 1,
      carts: 1,
      reviews: 1,
      subscribers: 1,
      discountCodesReset: 1,
      productRatingsCleared: 1,
    });

    // Nothing actually deleted.
    expect(await Order.countDocuments()).toBe(1);
    expect(await Cart.countDocuments()).toBe(1);
    expect(await Review.countDocuments()).toBe(1);
    expect(await Subscriber.countDocuments()).toBe(1);
    expect((await DiscountCode.findOne({ code: 'LAUNCH15' }).lean())!.uses).toBe(7);
    expect((await Product.findOne({ slug: 'ashes' }).lean())!.rating).toMatchObject({ avg: 4.8, count: 31 });
  });

  it('reports customer accounts without touching them, so the owner can decide separately', async () => {
    await seedFixture();
    const report = await resetLaunchData({ dryRun: true });
    expect(report.counts.customerAccounts).toBe(1);
    expect(await User.countDocuments()).toBe(2);
  });
});

describe('resetLaunchData — test accounts', () => {
  // example.com is reserved by RFC 2606 and can never belong to a real customer,
  // so it is the one email rule that is safe to delete on.
  async function seedAccounts() {
    await User.create({ name: 'Real', email: 'omareslam07@gmail.com', passwordHash: 'x', role: 'customer' });
    await User.create({ name: 'QA', email: 'test1783094062965@example.com', passwordHash: 'x', role: 'customer' });
    await User.create({ name: 'QA2', email: 'prop1783101880007@example.com', passwordHash: 'x', role: 'customer' });
    await User.create({ name: 'Admin', email: 'admin@herencia.example', passwordHash: 'x', role: 'admin' });
  }

  it('leaves every account alone by default', async () => {
    await seedAccounts();
    await resetLaunchData({ dryRun: false });
    expect(await User.countDocuments()).toBe(4);
  });

  it('deletes only example.com customer accounts when asked', async () => {
    await seedAccounts();

    const report = await resetLaunchData({ dryRun: false, deleteTestAccounts: true });

    expect(report.counts.testAccounts).toBe(2);
    expect(await User.countDocuments()).toBe(2);
    expect(await User.findOne({ email: 'omareslam07@gmail.com' })).not.toBeNull();
    expect(await User.findOne({ email: 'admin@herencia.example' })).not.toBeNull();
  });

  it('never deletes an admin, even on a reserved domain', async () => {
    await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: 'x', role: 'admin' });

    await resetLaunchData({ dryRun: false, deleteTestAccounts: true });

    expect(await User.countDocuments({ role: 'admin' })).toBe(1);
  });

  it('counts but does not delete test accounts on a dry run', async () => {
    await seedAccounts();
    const report = await resetLaunchData({ dryRun: true, deleteTestAccounts: true });
    expect(report.counts.testAccounts).toBe(2);
    expect(await User.countDocuments()).toBe(4);
  });
});

describe('resetLaunchData — destructive run', () => {
  it('removes orders, carts, reviews and subscribers', async () => {
    await seedFixture();

    await resetLaunchData({ dryRun: false });

    expect(await Order.countDocuments()).toBe(0);
    expect(await Cart.countDocuments()).toBe(0);
    expect(await Review.countDocuments()).toBe(0);
    expect(await Subscriber.countDocuments()).toBe(0);
  });

  it('zeroes product ratings without deleting the products', async () => {
    await seedFixture();

    await resetLaunchData({ dryRun: false });

    const product = await Product.findOne({ slug: 'ashes' }).lean();
    expect(product).not.toBeNull();
    expect(product!.rating).toMatchObject({ avg: 0, count: 0 });
    // The catalog itself is untouched.
    expect(product!.sizes[0]).toMatchObject({ label: '50ml', price: 500, stock: 14 });
    expect(product!.sampleStock).toBe(49);
  });

  it('resets discount code uses to zero but keeps the codes', async () => {
    await seedFixture();

    await resetLaunchData({ dryRun: false });

    const code = await DiscountCode.findOne({ code: 'LAUNCH15' }).lean();
    expect(code).not.toBeNull();
    expect(code!.uses).toBe(0);
    expect(code!.percent).toBe(15);
  });

  it('leaves catalog, settings, content and user accounts intact', async () => {
    await seedFixture();

    await resetLaunchData({ dryRun: false });

    expect(await Product.countDocuments()).toBe(1);
    expect(await ScentFamily.countDocuments()).toBe(1);
    expect(await Setting.countDocuments()).toBe(1);
    expect(await QuizQuestion.countDocuments()).toBe(1);
    expect(await Banner.countDocuments()).toBe(1);
    expect(await BlogPost.countDocuments()).toBe(1);
    expect(await User.countDocuments()).toBe(2);
    expect(await User.countDocuments({ role: 'admin' })).toBe(1);
  });

  it('touches no collection outside the agreed wipe list', async () => {
    await seedFixture();
    const before = await mongoose.connection.db!.listCollections().toArray();

    await resetLaunchData({ dryRun: false });

    // Guards against a future edit adding a deleteMany on a collection nobody signed off on.
    const after = await mongoose.connection.db!.listCollections().toArray();
    expect(after.map((c) => c.name).sort()).toEqual(before.map((c) => c.name).sort());
  });

  it('is safe to run twice', async () => {
    await seedFixture();
    await resetLaunchData({ dryRun: false });
    const second = await resetLaunchData({ dryRun: false });
    expect(second.counts.orders).toBe(0);
    expect(await Product.countDocuments()).toBe(1);
  });
});

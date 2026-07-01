import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadEnv } from './config/env';
import { ScentFamily } from './models/ScentFamily';
import { Product } from './models/Product';
import { Setting } from './models/Setting';
import { User } from './models/User';
import { Banner } from './models/Banner';
import { BlogPost } from './models/BlogPost';
import { QuizQuestion } from './models/QuizQuestion';
import { Review } from './models/Review';
import { recomputeProductRating } from './modules/review/service';

async function seed() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected. Clearing catalog collections...');
  await Promise.all([
    ScentFamily.deleteMany({}),
    Product.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({ role: 'admin' }),
    Banner.deleteMany({}),
    BlogPost.deleteMany({}),
    QuizQuestion.deleteMany({}),
    Review.deleteMany({}),
  ]);

  const [woody, floral, oriental] = await ScentFamily.create([
    { name: 'Woody', slug: 'woody', order: 1, description: 'Warm cedar, oud, and sandalwood.' },
    { name: 'Floral', slug: 'floral', order: 2, description: 'Rose, jasmine, and peony.' },
    { name: 'Oriental', slug: 'oriental', order: 3, description: 'Amber, spice, and incense.' },
  ]);

  const perfumes = await Product.create([
    {
      name: 'Royal Oud', type: 'perfume', shortDesc: 'A regal oud with smoky depth.',
      description: 'Royal Oud opens with bergamot before settling into a heart of rose and a base of aged oud and sandalwood.',
      images: ['https://picsum.photos/seed/royal-oud/800/800'], sizes: [{ label: '50ml', price: 1200, stock: 12 }, { label: '100ml', price: 1900, stock: 8 }],
      scentFamily: woody!._id, notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud', 'Sandalwood'] },
      gender: 'unisex', concentration: 'EDP', isFeatured: true, rating: { avg: 4.7, count: 23 },
    },
    {
      name: 'Rose Veil', type: 'perfume', shortDesc: 'A luminous, dewy rose.',
      description: 'Rose Veil layers Damascus rose over peony and a soft musk drydown.',
      images: ['https://picsum.photos/seed/rose-veil/800/800'], sizes: [{ label: '50ml', price: 950, stock: 15 }],
      scentFamily: floral!._id, notes: { top: ['Pink Pepper'], heart: ['Damascus Rose', 'Peony'], base: ['White Musk'] },
      gender: 'women', concentration: 'EDP', isFeatured: true, rating: { avg: 4.5, count: 18 },
    },
    {
      name: 'Amber Noir', type: 'perfume', shortDesc: 'Spiced amber for the evening.',
      description: 'Amber Noir is a warm, resinous amber wrapped in incense and vanilla.',
      images: ['https://picsum.photos/seed/amber-noir/800/800'], sizes: [{ label: '50ml', price: 1100, stock: 10 }, { label: '100ml', price: 1750, stock: 5 }],
      scentFamily: oriental!._id, notes: { top: ['Saffron'], heart: ['Incense'], base: ['Amber', 'Vanilla'] },
      gender: 'men', concentration: 'Extrait', isFeatured: false, rating: { avg: 4.8, count: 31 },
    },
    {
      name: 'Cedar Smoke', type: 'perfume', shortDesc: 'Dry cedar and vetiver.',
      description: 'Cedar Smoke is a crisp, woody composition built on cedar, vetiver, and a whisper of leather.',
      images: ['https://picsum.photos/seed/cedar-smoke/800/800'], sizes: [{ label: '50ml', price: 880, stock: 20 }],
      scentFamily: woody!._id, notes: { top: ['Cardamom'], heart: ['Cedar'], base: ['Vetiver', 'Leather'] },
      gender: 'unisex', concentration: 'EDT', isFeatured: false, rating: { avg: 4.3, count: 9 },
    },
  ]);

  await Product.create([
    {
      name: 'Heritage Trio', type: 'bundle', shortDesc: 'Three signature scents, curated.',
      description: 'A discovery set pairing Royal Oud, Rose Veil, and Amber Noir.',
      images: ['https://picsum.photos/seed/heritage-trio/800/800'], sizes: [{ label: 'Set', price: 2900, compareAtPrice: 3250, stock: 6 }],
      scentFamily: woody!._id, notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
      isFeatured: true, rating: { avg: 4.9, count: 7 },
      bundleItems: [
        { product: perfumes[0]!._id, qty: 1 },
        { product: perfumes[1]!._id, qty: 1 },
        { product: perfumes[2]!._id, qty: 1 },
      ],
    },
    {
      name: 'Woody Duo', type: 'bundle', shortDesc: 'Two woods, one gift box.',
      description: 'Royal Oud and Cedar Smoke together at a bundle price.',
      images: ['https://picsum.photos/seed/woody-duo/800/800'], sizes: [{ label: 'Set', price: 1900, compareAtPrice: 2080, stock: 9 }],
      scentFamily: woody!._id, notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
      isFeatured: false, rating: { avg: 4.6, count: 4 },
      bundleItems: [
        { product: perfumes[0]!._id, qty: 1 },
        { product: perfumes[3]!._id, qty: 1 },
      ],
    },
  ]);

  await Setting.create({
    whatsappNumber: env.WHATSAPP_NUMBER ?? '+200000000000',
    shippingFee: 60, freeShippingThreshold: 2000,
    socialLinks: { instagram: 'https://instagram.com/herencia' },
    hero: {
      title: 'Luxury in every drop', subtitle: 'Heritage perfumery, crafted for the modern connoisseur.',
      ctaText: 'Shop the collection', ctaLink: '/products', image: 'https://picsum.photos/seed/herencia-hero/1600/900',
    },
    contactEmail: 'hello@herencia.example',
  });

  const passwordHash = await bcrypt.hash('admin1234', 12);
  const adminUser = await User.create({ name: 'HERENCIA Admin', email: 'admin@herencia.example', passwordHash, role: 'admin' });

  // --- Milestone 3 demo content ---

  await Banner.create([
    {
      title: 'Discover Our Heritage',
      subtitle: 'Luxury perfumery, crafted for the modern connoisseur.',
      image: 'https://picsum.photos/seed/banner-hero/1600/600',
      ctaText: 'Shop Now',
      ctaLink: '/products',
      placement: 'home_hero',
      isActive: true,
      order: 1,
    },
    {
      title: 'Free shipping on orders over 2,000 EGP',
      image: 'https://picsum.photos/seed/banner-strip/1200/200',
      placement: 'global_top',
      isActive: true,
      order: 1,
    },
  ]);

  await BlogPost.create({
    title: 'The Art of Oud',
    slug: 'the-art-of-oud',
    excerpt: 'Explore the ancient origins and modern mastery of oud — the most prized ingredient in luxury perfumery.',
    body: 'Oud, also known as agarwood, is one of the rarest and most coveted raw materials in perfumery. Harvested from the heartwood of Aquilaria trees infected by a specific mold, genuine oud can take decades to form.\n\nIts scent is complex and impossible to replicate synthetically in full fidelity — smoky, sweet, animalic, and woody all at once. Great oud perfumes balance this intensity with softer accords: rose, amber, or sandalwood.\n\nAt Herencia, we source our oud from trusted artisans and use it as a statement material — never hidden, always the soul of the composition.',
    coverImage: 'https://picsum.photos/seed/blog-oud/1200/675',
    tags: ['oud', 'ingredients', 'craftsmanship'],
    isPublished: true,
    publishedAt: new Date(),
  });

  await QuizQuestion.create([
    {
      order: 1,
      question: 'Which mood best describes you today?',
      answers: [
        { label: 'Warm & woody', weights: { scentFamily: woody!._id, value: 3 } },
        { label: 'Fresh & floral', weights: { scentFamily: floral!._id, value: 3 } },
        { label: 'Mysterious & spiced', weights: { scentFamily: oriental!._id, value: 3 } },
      ],
    },
    {
      order: 2,
      question: 'When do you reach for a fragrance?',
      answers: [
        { label: 'Morning & daytime', weights: { scentFamily: floral!._id, value: 2 } },
        { label: 'Evening & events', weights: { scentFamily: oriental!._id, value: 2 } },
        { label: 'Everyday, all day', weights: { scentFamily: woody!._id, value: 2 } },
      ],
    },
    {
      order: 3,
      question: 'Which note family do you gravitate toward?',
      answers: [
        { label: 'Cedar, oud, sandalwood', weights: { scentFamily: woody!._id, value: 3 } },
        { label: 'Rose, jasmine, peony', weights: { scentFamily: floral!._id, value: 3 } },
        { label: 'Amber, incense, vanilla', weights: { scentFamily: oriental!._id, value: 3 } },
        { label: 'I love them all', weights: { value: 1 } },
      ],
    },
  ]);

  await Review.create([
    {
      product: perfumes[0]!._id,
      user: adminUser._id,
      rating: 5,
      title: 'Exceptional depth',
      body: 'Royal Oud is unlike anything I have tried — the oud is bold yet refined, and the sandalwood drydown is stunning.',
      isApproved: true,
    },
    {
      product: perfumes[1]!._id,
      user: adminUser._id,
      rating: 4,
      title: 'Delicate and refined',
      body: 'Rose Veil is a masterclass in restraint — the Damascus rose never tips into sweetness, and the musk finish is beautiful.',
      isApproved: true,
    },
  ]);

  await recomputeProductRating(String(perfumes[0]!._id));
  await recomputeProductRating(String(perfumes[1]!._id));

  console.log('Seed complete: 3 families, 4 perfumes, 2 bundles, settings, admin user (admin@herencia.example / admin1234), 2 banners, 1 blog post, 3 quiz questions, 2 approved reviews.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});

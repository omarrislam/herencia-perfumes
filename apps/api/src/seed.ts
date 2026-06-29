import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadEnv } from './config/env';
import { ScentFamily } from './models/ScentFamily';
import { Product } from './models/Product';
import { Setting } from './models/Setting';
import { User } from './models/User';

async function seed() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected. Clearing catalog collections...');
  await Promise.all([
    ScentFamily.deleteMany({}),
    Product.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({ role: 'admin' }),
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
      images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 12 }, { label: '100ml', price: 1900, stock: 8 }],
      scentFamily: woody!._id, notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud', 'Sandalwood'] },
      gender: 'unisex', concentration: 'EDP', isFeatured: true, rating: { avg: 4.7, count: 23 },
    },
    {
      name: 'Rose Veil', type: 'perfume', shortDesc: 'A luminous, dewy rose.',
      description: 'Rose Veil layers Damascus rose over peony and a soft musk drydown.',
      images: ['herencia/rose-veil'], sizes: [{ label: '50ml', price: 950, stock: 15 }],
      scentFamily: floral!._id, notes: { top: ['Pink Pepper'], heart: ['Damascus Rose', 'Peony'], base: ['White Musk'] },
      gender: 'women', concentration: 'EDP', isFeatured: true, rating: { avg: 4.5, count: 18 },
    },
    {
      name: 'Amber Noir', type: 'perfume', shortDesc: 'Spiced amber for the evening.',
      description: 'Amber Noir is a warm, resinous amber wrapped in incense and vanilla.',
      images: ['herencia/amber-noir'], sizes: [{ label: '50ml', price: 1100, stock: 10 }, { label: '100ml', price: 1750, stock: 5 }],
      scentFamily: oriental!._id, notes: { top: ['Saffron'], heart: ['Incense'], base: ['Amber', 'Vanilla'] },
      gender: 'men', concentration: 'Extrait', isFeatured: false, rating: { avg: 4.8, count: 31 },
    },
    {
      name: 'Cedar Smoke', type: 'perfume', shortDesc: 'Dry cedar and vetiver.',
      description: 'Cedar Smoke is a crisp, woody composition built on cedar, vetiver, and a whisper of leather.',
      images: ['herencia/cedar-smoke'], sizes: [{ label: '50ml', price: 880, stock: 20 }],
      scentFamily: woody!._id, notes: { top: ['Cardamom'], heart: ['Cedar'], base: ['Vetiver', 'Leather'] },
      gender: 'unisex', concentration: 'EDT', isFeatured: false, rating: { avg: 4.3, count: 9 },
    },
  ]);

  await Product.create([
    {
      name: 'Heritage Trio', type: 'bundle', shortDesc: 'Three signature scents, curated.',
      description: 'A discovery set pairing Royal Oud, Rose Veil, and Amber Noir.',
      images: ['herencia/heritage-trio'], sizes: [{ label: 'Set', price: 2900, compareAtPrice: 3250, stock: 6 }],
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
      images: ['herencia/woody-duo'], sizes: [{ label: 'Set', price: 1900, compareAtPrice: 2080, stock: 9 }],
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
      ctaText: 'Shop the collection', ctaLink: '/products', image: 'herencia/hero',
    },
    contactEmail: 'hello@herencia.example',
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);
  await User.create({ name: 'HERENCIA Admin', email: 'admin@herencia.example', passwordHash, role: 'admin' });

  console.log('Seed complete: 3 families, 4 perfumes, 2 bundles, settings, admin user (admin@herencia.example / admin1234).');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});

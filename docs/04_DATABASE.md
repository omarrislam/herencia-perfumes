# 04 — Database (MongoDB / Mongoose)

Money is stored as a `number` in **EGP** (2 decimal places enforced at the app layer);
each product keeps a single source `price` per size. Every collection has timestamps
(`createdAt`, `updatedAt`).

## Product
```ts
{
  name: string,
  slug: string,                 // unique, indexed
  type: 'perfume' | 'bundle',
  shortDesc: string,
  description: string,          // long, markdown allowed
  images: string[],            // Cloudinary public IDs / URLs
  sizes: [{ label: string,      // e.g. "50ml", "100ml"
            price: number,       // EGP
            compareAtPrice?: number,
            stock: number }],
  basePrice: number,            // EGP, denormalized = min size price (for sort/filter)
  scentFamily: ObjectId,        // ref ScentFamily
  notes: { top: string[], heart: string[], base: string[] },
  gender: 'men' | 'women' | 'unisex',
  concentration: 'EDT' | 'EDP' | 'Extrait' | 'Other',
  rating: { avg: number, count: number },   // denormalized from reviews
  isFeatured: boolean,
  isActive: boolean,
  seo: { title?: string, description?: string },
  // bundle only:
  bundleItems?: [{ product: ObjectId, qty: number }],
}
```
Indexes: `slug` (unique), `type`, `isActive`, `scentFamily`, `gender`, text index on
`name`/`shortDesc` for search.

## ScentFamily
```ts
{ name: string, slug: string, description?: string, order: number }
```

## User
```ts
{
  name: string,
  email: string,                // unique, indexed, lowercased
  passwordHash: string,
  role: 'customer' | 'admin',
  phone?: string,
  addresses: [{ label, line1, line2?, city, governorate, phone, isDefault }],
  wishlist: ObjectId[],         // ref Product
}
```

## Order
```ts
{
  orderNumber: string,          // human-friendly, unique
  items: [{ product: ObjectId, name, sizeLabel, unitPrice, qty, image }], // snapshot
  customer: { name, phone, email? },
  shippingAddress: { line1, line2?, city, governorate, phone },
  subtotal: number,
  shipping: number,
  total: number,                // EGP
  status: 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled',
  paymentMethod: 'cod',
  notes?: string,
  user?: ObjectId,              // if placed while logged in
}
```
Indexes: `orderNumber` (unique), `status`, `createdAt`.

## Review
```ts
{
  product: ObjectId, user: ObjectId,
  rating: 1|2|3|4|5, title?: string, body: string,
  isApproved: boolean,          // admin moderation
}
```
Indexes: `product`, `isApproved`. One review per user per product (compound unique).
On approve/delete → recompute `Product.rating`.

## Banner
```ts
{ title, subtitle?, image, ctaText?, ctaLink?, placement: 'home_hero'|'home_strip'|'global_top',
  startsAt?: Date, endsAt?: Date, isActive: boolean, order: number }
```

## BlogPost
```ts
{ title, slug, excerpt, body, coverImage, tags: string[],
  isPublished: boolean, publishedAt?: Date, seo: { title?, description? } }
```
Indexes: `slug` (unique), `isPublished`, `publishedAt`.

## Quiz
```ts
QuizQuestion { order: number, question: string,
  answers: [{ label: string, weights: { scentFamily?: ObjectId, gender?: string, value: number } }] }
```
Result computed at runtime from accumulated weights → top scent family/gender →
query matching active products. (Persist a `QuizResult` only if we want analytics — optional.)

## Setting (singleton)
```ts
{ whatsappNumber: string, shippingFee: number, freeShippingThreshold?: number,
  socialLinks: { instagram?, facebook?, tiktok? },
  hero: { title, subtitle, ctaText, ctaLink, image },
  contactEmail?: string }
```

## Notes
- Denormalize `rating` and `basePrice` for fast list/sort; recompute on writes.
- Store image references as Cloudinary public IDs; build URLs in a helper.
- Seed script creates: admin user, scent families, 3–4 demo perfumes, 1–2 bundles,
  default settings.

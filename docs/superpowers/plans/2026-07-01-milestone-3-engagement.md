# Milestone 3 — Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the engagement layer to HERENCIA — moderated ratings & reviews (with product-rating recompute), the Find Your Scent quiz, scheduled offer banners, and a blog (with SEO) — across the shared/api/web workspaces.

**Architecture:** Four independent subsystems, each following the established three-layer flow (shared Zod schema/DTO → Express module: model + thin route → React Query + typed client + page). Reviews recompute the denormalized `Product.rating` on every moderation change. Quiz **weights live server-side only** — the public quiz endpoint exposes answer labels but never weights, and recommendations are computed server-side. Blog posts extend the existing M1 SSR-lite SEO seam (`routeMetaForPath` + `buildSitemap`) to emit per-post `<head>` + Article JSON-LD.

**Tech Stack:** Node/Express/TypeScript, Mongoose 8, Zod (shared), Vitest + Supertest (api), React 18 + React Router + React Query + Vitest/RTL (web). No new runtime deps.

## Global Constraints

- **TypeScript strict** + `noUncheckedIndexedAccess`; no `any` except the sanctioned `serialize.ts` `AnyDoc` pattern.
- **Validate every input with shared Zod schemas** from `@herencia/shared`.
- **Auth:** reuse Milestone 2 — `authenticate`/`requireAuth`/`requireRole`/`requireAdmin` (`apps/api/src/middleware/auth.ts`, `requireAdmin.ts`); JWT httpOnly cookie `herencia_token`. Admin routes mount under the already-guarded `adminRouter()` (it does `router.use(requireAdmin)`); customer-only POSTs use `authenticate, requireAuth`; public GETs are open.
- **Error shape** `{ error: { message, code, details? } }` via `HttpError` + `errorHandler` (`apps/api/src/middleware/error.ts`); a malformed `:id` is mapped to 400 by the existing CastError handler.
- **Pagination envelope** `{ items, total, page, pages }`.
- **Money** EGP numbers (banners/blog carry no money).
- **Quiz weights are never sent to the client** — the public `GET /api/quiz` returns labels only; recommendations are computed server-side.
- **Reviews recompute `Product.rating`** (`{ avg, count }`) from APPROVED reviews on every approve/unapprove/delete; one review per user per product (compound unique).
- **SEO:** blog posts get server-injected `<title>`/description/canonical/OG + **Article** JSON-LD via the existing `apps/api/src/lib/seo.ts` seam; published posts appear in `sitemap.xml`. Semantic HTML, `alt` text, heading order.
- **DTO contract single-sourced** in `packages/shared`; API output ids are strings.
- **Mobile-first, dark mode, brand tokens** (`text-content`,`text-muted`,`bg-bg`,`surface`,`border-line`,`bg-maroon`,`text-cream`,`text-accent`,`font-display`,`font-body`).
- **Commits:** frequent; every commit body ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `feat/milestone-3-engagement` (NOT master). **Scope:** engagement only — no animations/a11y-audit/perf/deploy (M4), no online payments/email (post-launch). **Rate-limiting** of mutations is deferred to the M4 security pass (reviews are auth-gated + one-per-user, so abuse is bounded) — do NOT add it here.
- **Tests:** api suite runs serialized (`fileParallelism: false`) with `mongodb-memory-server`; mirror `apps/api/src/test/db.ts` (`connectMemory`/`clearDb`) + `apps/api/src/test/auth.ts` (`authCookie(userId, role)`). `createApp({ clientOrigin })` (no adminToken). Run lint via the **root** `npm run lint`.

---

## File Structure

**`packages/shared/src/`**
- `enums.ts` — *modify*: add `BANNER_PLACEMENT`.
- `schemas/review.ts` — *create*: review create/moderation schemas + `ReviewDTO`.
- `schemas/banner.ts` — *create*: banner schema + `BannerDTO`.
- `schemas/blog.ts` — *create*: blog post schema + `BlogPostDTO`/`BlogPostListItemDTO`.
- `schemas/quiz.ts` — *create*: quiz question/result schemas + public DTOs.
- `index.ts` — *modify*: re-export the four new modules.

**`apps/api/src/`**
- `models/Review.ts`, `models/Banner.ts`, `models/BlogPost.ts`, `models/QuizQuestion.ts` — *create*.
- `modules/review/service.ts` — *create*: `recomputeProductRating`.
- `routes/reviews.ts` — *create*: public product reviews (GET/POST).
- `routes/quiz.ts` — *create*: public quiz (GET questions, POST result).
- `routes/banners.ts` — *create*: public banners (GET by placement).
- `routes/blog.ts` — *create*: public blog (GET list, GET :slug).
- `routes/admin.ts` — *modify*: add reviews/quiz/banners/blog admin CRUD.
- `lib/serialize.ts` — *modify*: add `toReviewDTO`, `toBannerDTO`, `toBlogPostDTO`, `toBlogListItemDTO`, `toQuizQuestionPublicDTO`, `toQuizQuestionAdminDTO`.
- `lib/seo.ts` — *modify*: blog Article meta in `routeMetaForPath`; blog slugs in `buildSitemap`.
- `app.ts` — *modify*: mount the four public routers; pass blog slugs to the sitemap.
- `seed.ts` — *modify*: demo reviews, banners, a blog post, quiz questions.

**`apps/web/src/`**
- `lib/api.ts` — *modify*: public client fns (reviews/quiz/banners/blog).
- `features/admin/adminClient.ts` — *modify*: admin client fns for the four subsystems.
- `features/reviews/ReviewsSection.tsx` — *create*: list + submit on product detail.
- `pages/ProductDetail.tsx` — *modify*: render `<ReviewsSection>`.
- `pages/FindYourScent.tsx` — *create*: quiz flow + results.
- `pages/Blog.tsx`, `pages/BlogPost.tsx` — *create*.
- `components/BannerStrip.tsx` — *create*: render active banners by placement.
- `pages/Home.tsx` — *modify*: render hero/strip banners.
- `app/StorefrontLayout.tsx` — *modify*: global_top banner + Blog/Quiz nav links.
- `pages/admin/AdminReviews.tsx`, `AdminBanners.tsx`, `AdminBlog.tsx`, `AdminQuiz.tsx` — *create*.
- `pages/admin/AdminApp.tsx` — *modify*: nav links + routes for the four admin pages.
- `app/router.tsx` — *modify*: `/find-your-scent`, `/blog`, `/blog/:slug` routes.

---

## Task 1: Shared — review & banner schemas/DTOs

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/review.ts`, `packages/shared/src/schemas/banner.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/review.test.ts`, `packages/shared/src/schemas/banner.test.ts`

**Interfaces:**
- Produces:
  - `createReviewSchema`/`CreateReviewInput` (`{ rating: 1-5 int, title?: ≤100, body: 1..2000 }`).
  - `updateReviewSchema`/`UpdateReviewInput` (`{ isApproved: boolean }`).
  - `ReviewDTO` = `{ id, productId, user: { id, name }, rating, title?, body, isApproved, createdAt }`.
  - `BANNER_PLACEMENT` = `['home_hero','home_strip','global_top'] as const`; `BannerPlacement`.
  - `bannerSchema`/`BannerInput` (`{ title, subtitle?, image, ctaText?, ctaLink?, placement, startsAt?, endsAt?, isActive, order }`).
  - `BannerDTO` = `BannerInput & { id }` with dates as ISO strings (`startsAt?: string`, `endsAt?: string`).

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/schemas/review.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createReviewSchema, updateReviewSchema } from './review';

describe('review schemas', () => {
  it('accepts a valid review', () => {
    expect(createReviewSchema.safeParse({ rating: 5, title: 'Great', body: 'Lovely scent' }).success).toBe(true);
  });
  it('rejects rating out of range', () => {
    expect(createReviewSchema.safeParse({ rating: 6, body: 'x' }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 0, body: 'x' }).success).toBe(false);
  });
  it('rejects an empty body', () => {
    expect(createReviewSchema.safeParse({ rating: 4, body: '' }).success).toBe(false);
  });
  it('validates the moderation payload', () => {
    expect(updateReviewSchema.safeParse({ isApproved: true }).success).toBe(true);
    expect(updateReviewSchema.safeParse({ isApproved: 'yes' }).success).toBe(false);
  });
});
```

`packages/shared/src/schemas/banner.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bannerSchema, BANNER_PLACEMENT } from './banner';

describe('banner schema', () => {
  it('accepts a valid banner', () => {
    expect(bannerSchema.safeParse({ title: 'Sale', image: 'banners/sale', placement: 'home_hero' }).success).toBe(true);
  });
  it('rejects an unknown placement', () => {
    expect(bannerSchema.safeParse({ title: 'Sale', image: 'x', placement: 'sidebar' }).success).toBe(false);
  });
  it('exposes the placement list', () => {
    expect(BANNER_PLACEMENT).toContain('global_top');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './review'` / `'./banner'`.

- [ ] **Step 3: Implement**

Append to `packages/shared/src/enums.ts`:
```ts
export const BANNER_PLACEMENT = ['home_hero', 'home_strip', 'global_top'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENT)[number];
```

`packages/shared/src/schemas/review.ts`:
```ts
import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(1).max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({ isApproved: z.boolean() });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export type ReviewDTO = {
  id: string;
  productId: string;
  user: { id: string; name: string };
  rating: number;
  title?: string;
  body: string;
  isApproved: boolean;
  createdAt: string;
};
```

`packages/shared/src/schemas/banner.ts`:
```ts
import { z } from 'zod';
import { BANNER_PLACEMENT } from '../enums';

export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
  image: z.string().trim().min(1),
  ctaText: z.string().trim().max(40).optional(),
  ctaLink: z.string().trim().max(300).optional(),
  placement: z.enum(BANNER_PLACEMENT),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});
export type BannerInput = z.infer<typeof bannerSchema>;

export type BannerDTO = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  placement: (typeof BANNER_PLACEMENT)[number];
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  order: number;
};
```

Append to `packages/shared/src/index.ts`:
```ts
export * from './schemas/review';
export * from './schemas/banner';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/enums.ts packages/shared/src/schemas/review.ts packages/shared/src/schemas/banner.ts packages/shared/src/schemas/review.test.ts packages/shared/src/schemas/banner.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): review + banner schemas and DTOs"
```

---

## Task 2: Shared — blog & quiz schemas/DTOs

**Files:**
- Create: `packages/shared/src/schemas/blog.ts`, `packages/shared/src/schemas/quiz.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/blog.test.ts`, `packages/shared/src/schemas/quiz.test.ts`

**Interfaces:**
- Produces:
  - `blogPostSchema`/`BlogPostInput` (`{ title, slug?, excerpt, body, coverImage, tags: string[], isPublished, seo: { title?, description? } }`).
  - `BlogPostDTO` = `{ id, title, slug, excerpt, body, coverImage, tags, isPublished, publishedAt?, seo, createdAt }`.
  - `BlogPostListItemDTO` = `Omit<BlogPostDTO, 'body'>`.
  - `BlogListDTO` = `{ items: BlogPostListItemDTO[]; total; page; pages }`.
  - `quizQuestionSchema`/`QuizQuestionInput` (admin; carries weights): `{ order, question, answers: [{ label, weights: { scentFamily?: objectId, gender?: 'men'|'women'|'unisex', value: number } }] }`.
  - `quizResultSchema`/`QuizResultInput` = `{ selections: [{ questionId: objectId, answerIndex: int ≥0 }] }`.
  - `QuizAnswerPublicDTO` = `{ label: string }`; `QuizQuestionPublicDTO` = `{ id, order, question, answers: QuizAnswerPublicDTO[] }` (NO weights).
  - `QuizQuestionAdminDTO` = full question incl. weights (`answers[].weights`).
  - `QuizResultDTO` = `{ scentFamily: ScentFamilyDTO | null; gender: string | null; recommended: ProductDTO[] }`.

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/schemas/blog.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { blogPostSchema } from './blog';

describe('blogPostSchema', () => {
  it('accepts a valid post', () => {
    expect(blogPostSchema.safeParse({
      title: 'Notes on Oud', excerpt: 'A primer', body: '# Oud', coverImage: 'blog/oud', tags: ['oud'], isPublished: true,
    }).success).toBe(true);
  });
  it('defaults tags to [] and isPublished to false', () => {
    const r = blogPostSchema.safeParse({ title: 'T', excerpt: 'e', body: 'b', coverImage: 'c' });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.tags).toEqual([]); expect(r.data.isPublished).toBe(false); }
  });
  it('rejects a missing title', () => {
    expect(blogPostSchema.safeParse({ excerpt: 'e', body: 'b', coverImage: 'c' }).success).toBe(false);
  });
});
```

`packages/shared/src/schemas/quiz.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { quizQuestionSchema, quizResultSchema } from './quiz';

const oid = 'a'.repeat(24);

describe('quiz schemas', () => {
  it('accepts a valid admin question with weights', () => {
    expect(quizQuestionSchema.safeParse({
      order: 1, question: 'Day or night?',
      answers: [{ label: 'Day', weights: { gender: 'unisex', value: 2 } }, { label: 'Night', weights: { scentFamily: oid, value: 3 } }],
    }).success).toBe(true);
  });
  it('requires at least two answers', () => {
    expect(quizQuestionSchema.safeParse({ order: 1, question: 'q', answers: [{ label: 'only', weights: { value: 1 } }] }).success).toBe(false);
  });
  it('validates a result request', () => {
    expect(quizResultSchema.safeParse({ selections: [{ questionId: oid, answerIndex: 0 }] }).success).toBe(true);
    expect(quizResultSchema.safeParse({ selections: [{ questionId: 'x', answerIndex: 0 }] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — missing `./blog` / `./quiz`.

- [ ] **Step 3: Implement**

`packages/shared/src/schemas/blog.ts`:
```ts
import { z } from 'zod';

export const blogPostSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().min(1).max(300),
  body: z.string().min(1),
  coverImage: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
  isPublished: z.boolean().default(false),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).default({}),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;

export type BlogPostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  seo: { title?: string; description?: string };
  createdAt: string;
};
export type BlogPostListItemDTO = Omit<BlogPostDTO, 'body'>;
export type BlogListDTO = { items: BlogPostListItemDTO[]; total: number; page: number; pages: number };
```

`packages/shared/src/schemas/quiz.ts`:
```ts
import { z } from 'zod';
import { GENDER } from '../enums';
import type { ScentFamilyDTO, ProductDTO } from './catalog';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

const quizAnswerSchema = z.object({
  label: z.string().trim().min(1).max(120),
  weights: z.object({
    scentFamily: objectId.optional(),
    gender: z.enum(GENDER).optional(),
    value: z.number().int().min(0).max(10).default(1),
  }),
});

export const quizQuestionSchema = z.object({
  order: z.number().int().min(0).default(0),
  question: z.string().trim().min(1).max(200),
  answers: z.array(quizAnswerSchema).min(2).max(8),
});
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

export const quizResultSchema = z.object({
  selections: z
    .array(z.object({ questionId: objectId, answerIndex: z.number().int().min(0) }))
    .min(1),
});
export type QuizResultInput = z.infer<typeof quizResultSchema>;

export type QuizAnswerPublicDTO = { label: string };
export type QuizQuestionPublicDTO = { id: string; order: number; question: string; answers: QuizAnswerPublicDTO[] };
export type QuizQuestionAdminDTO = {
  id: string;
  order: number;
  question: string;
  answers: { label: string; weights: { scentFamily?: string; gender?: string; value: number } }[];
};
export type QuizResultDTO = { scentFamily: ScentFamilyDTO | null; gender: string | null; recommended: ProductDTO[] };
```

Append to `packages/shared/src/index.ts`:
```ts
export * from './schemas/blog';
export * from './schemas/quiz';
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/blog.ts packages/shared/src/schemas/quiz.ts packages/shared/src/schemas/blog.test.ts packages/shared/src/schemas/quiz.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): blog + quiz schemas and DTOs"
```

---

## Task 3: API — Reviews (model, rating recompute, public + admin routes)

**Files:**
- Create: `apps/api/src/models/Review.ts`, `apps/api/src/modules/review/service.ts`, `apps/api/src/routes/reviews.ts`
- Modify: `apps/api/src/lib/serialize.ts` (`toReviewDTO`), `apps/api/src/routes/admin.ts` (admin review routes), `apps/api/src/app.ts` (mount reviews router)
- Test: `apps/api/src/routes/reviews.test.ts`, `apps/api/src/routes/adminReviews.test.ts`

**Interfaces:**
- Consumes: `createReviewSchema`, `updateReviewSchema`, `ReviewDTO` (shared); `Product`, `User` models; `authenticate`, `requireAuth`; `requireAdmin` (already mounted on admin router).
- Produces:
  - `Review` model (`{ product, user, rating, title?, body, isApproved }`, compound unique `{product,user}`).
  - `recomputeProductRating(productId): Promise<void>` (`modules/review/service.ts`) — sets `Product.rating` from APPROVED reviews.
  - `toReviewDTO(doc): ReviewDTO`.
  - Public: `GET /api/products/:slug/reviews` (approved, paginated), `POST /api/products/:slug/reviews` (auth → pending review).
  - Admin: `GET /api/admin/reviews?status=pending|approved`, `PUT /api/admin/reviews/:id`, `DELETE /api/admin/reviews/:id`.

- [ ] **Step 1: Write the failing service + public-route tests**

`apps/api/src/routes/reviews.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
let userId: string;
let cookie: string;
beforeEach(async () => {
  await clearDb();
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  userId = String(u._id);
  cookie = authCookie(userId, 'customer');
});

describe('POST /api/products/:slug/reviews', () => {
  it('401s a guest', async () => {
    expect((await request(app).post('/api/products/royal-oud/reviews').send({ rating: 5, body: 'great' })).status).toBe(401);
  });
  it('creates a pending review for a logged-in user', async () => {
    const res = await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 5, body: 'great' });
    expect(res.status).toBe(201);
    expect(res.body.isApproved).toBe(false);
    expect(res.body.user.name).toBe('Mai');
  });
  it('rejects a second review by the same user with 409', async () => {
    await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 5, body: 'a' });
    const res = await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 4, body: 'b' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/products/:slug/reviews', () => {
  it('returns only approved reviews', async () => {
    await Review.create({ product: productId, user: userId, rating: 5, body: 'approved one', isApproved: true });
    const u2 = await User.create({ name: 'Sam', email: 's@x.com', passwordHash: 'x', role: 'customer' });
    await Review.create({ product: productId, user: u2._id, rating: 2, body: 'pending one', isApproved: false });
    const res = await request(app).get('/api/products/royal-oud/reviews');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].body).toBe('approved one');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- reviews.test`
Expected: FAIL — `Review` model / routes missing.

- [ ] **Step 3: Implement the model, service, serializer**

`apps/api/src/models/Review.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    body: { type: String, required: true },
    isApproved: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review =
  (mongoose.models.Review as mongoose.Model<ReviewDoc>) ?? mongoose.model('Review', reviewSchema);
```

`apps/api/src/modules/review/service.ts`:
```ts
import { Review } from '../../models/Review';
import { Product } from '../../models/Product';

export async function recomputeProductRating(productId: string): Promise<void> {
  const agg = await Review.aggregate<{ _id: null; avg: number; count: number }>([
    { $match: { product: new (await import('mongoose')).Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0;
  const count = agg[0]?.count ?? 0;
  await Product.updateOne({ _id: productId }, { $set: { 'rating.avg': avg, 'rating.count': count } });
}
```

Append to `apps/api/src/lib/serialize.ts` (add `ReviewDTO` to the shared import):
```ts
import type { ReviewDTO } from '@herencia/shared';

export function toReviewDTO(doc: AnyDoc): ReviewDTO {
  const u = doc.user && typeof doc.user === 'object' && doc.user._id ? doc.user : null;
  return {
    id: String(doc._id),
    productId: String(doc.product),
    user: { id: String(u ? u._id : doc.user), name: u?.name ?? 'Customer' },
    rating: doc.rating,
    title: doc.title ?? undefined,
    body: doc.body,
    isApproved: !!doc.isApproved,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}
```

- [ ] **Step 4: Implement the public reviews router + mount**

`apps/api/src/routes/reviews.ts`:
```ts
import { Router } from 'express';
import { createReviewSchema } from '@herencia/shared';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { toReviewDTO } from '../lib/serialize';

export function reviewRouter(): Router {
  const router = Router();

  router.get('/products/:slug/reviews', async (req, res, next) => {
    try {
      const product = await Product.findOne({ slug: req.params['slug'], isActive: true }).select('_id').lean();
      if (!product) throw new HttpError(404, 'Product not found', 'not_found');
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 10) || 10));
      const filter = { product: product._id, isApproved: true };
      const [docs, total] = await Promise.all([
        Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
        Review.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toReviewDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/products/:slug/reviews', authenticate, requireAuth, async (req, res, next) => {
    try {
      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const product = await Product.findOne({ slug: req.params['slug'], isActive: true }).select('_id').lean();
      if (!product) throw new HttpError(404, 'Product not found', 'not_found');
      if (await Review.exists({ product: product._id, user: req.user!.id })) {
        throw new HttpError(409, 'You have already reviewed this product', 'conflict');
      }
      const doc = await Review.create({ ...parsed.data, product: product._id, user: req.user!.id, isApproved: false });
      const populated = await doc.populate('user', 'name');
      res.status(201).json(toReviewDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

Mount in `apps/api/src/app.ts`:
```ts
import { reviewRouter } from './routes/reviews';
// ...
app.use('/api', reviewRouter());
```

- [ ] **Step 5: Run the public reviews tests**

Run: `npm run test --workspace apps/api -- reviews.test`
Expected: PASS.

- [ ] **Step 6: Write the failing admin reviews tests**

`apps/api/src/routes/adminReviews.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
let reviewId: string;
beforeEach(async () => {
  await clearDb();
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  const r = await Review.create({ product: p._id, user: u._id, rating: 4, body: 'nice', isApproved: false });
  reviewId = String(r._id);
});

describe('admin reviews', () => {
  it('403s a customer', async () => {
    expect((await request(app).get('/api/admin/reviews').set('Cookie', authCookie('000000000000000000000002', 'customer'))).status).toBe(403);
  });
  it('lists the pending queue', async () => {
    const res = await request(app).get('/api/admin/reviews?status=pending').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
  it('approving recomputes product rating', async () => {
    const res = await request(app).put(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN).send({ isApproved: true });
    expect(res.status).toBe(200);
    expect(res.body.isApproved).toBe(true);
    const product = await Product.findById(productId).lean();
    expect(product!.rating.count).toBe(1);
    expect(product!.rating.avg).toBe(4);
  });
  it('deleting an approved review recomputes rating back to 0', async () => {
    await request(app).put(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN).send({ isApproved: true });
    const del = await request(app).delete(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN);
    expect(del.status).toBe(204);
    const product = await Product.findById(productId).lean();
    expect(product!.rating.count).toBe(0);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/api -- adminReviews`
Expected: FAIL — admin review routes missing.

- [ ] **Step 8: Implement the admin review routes**

In `apps/api/src/routes/admin.ts` add imports:
```ts
import { updateReviewSchema } from '@herencia/shared';
import { Review } from '../models/Review';
import { recomputeProductRating } from '../modules/review/service';
import { toReviewDTO } from '../lib/serialize';
```
and these routes inside `adminRouter()` (before `return router;`):
```ts
// ---- Reviews ----
router.get('/reviews', async (req, res, next) => {
  try {
    const status = req.query['status'];
    const filter: Record<string, unknown> = {};
    if (status === 'pending') filter['isApproved'] = false;
    else if (status === 'approved') filter['isApproved'] = true;
    const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
    const [docs, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
      Review.countDocuments(filter),
    ]);
    res.json({ items: docs.map(toReviewDTO), total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
});

router.put('/reviews/:id', async (req, res, next) => {
  try {
    const parsed = updateReviewSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const doc = await Review.findByIdAndUpdate(req.params['id'], { isApproved: parsed.data.isApproved }, { new: true }).populate('user', 'name');
    if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
    await recomputeProductRating(String(doc.product));
    res.json(toReviewDTO(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

router.delete('/reviews/:id', async (req, res, next) => {
  try {
    const doc = await Review.findByIdAndDelete(req.params['id']).lean();
    if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
    await recomputeProductRating(String(doc.product));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 9: Run admin reviews tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- adminReviews`
Expected: PASS.
Run: `npm run test --workspace apps/api && npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/Review.ts apps/api/src/modules/review apps/api/src/routes/reviews.ts apps/api/src/routes/reviews.test.ts apps/api/src/routes/adminReviews.test.ts apps/api/src/lib/serialize.ts apps/api/src/routes/admin.ts apps/api/src/app.ts
git commit -m "feat(api): moderated product reviews + rating recompute (public + admin)"
```

---

## Task 4: API — Quiz (model, public questions/result, admin CRUD)

**Files:**
- Create: `apps/api/src/models/QuizQuestion.ts`, `apps/api/src/routes/quiz.ts`
- Modify: `apps/api/src/lib/serialize.ts` (`toQuizQuestionPublicDTO`, `toQuizQuestionAdminDTO`), `apps/api/src/routes/admin.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/routes/quiz.test.ts`, `apps/api/src/routes/adminQuiz.test.ts`

**Interfaces:**
- Consumes: `quizQuestionSchema`, `quizResultSchema`, `QuizQuestionPublicDTO`, `QuizResultDTO` (shared); `Product`, `ScentFamily` models; `toProductDTO`, `toScentFamilyDTO`.
- Produces:
  - `QuizQuestion` model.
  - `toQuizQuestionPublicDTO` (NO weights) / `toQuizQuestionAdminDTO` (weights).
  - Public: `GET /api/quiz` (ordered questions, labels only), `POST /api/quiz/result` (selections → recommended products).
  - Admin: `GET/POST /api/admin/quiz`, `PUT/DELETE /api/admin/quiz/:id`.

- [ ] **Step 1: Write the failing public quiz tests**

`apps/api/src/routes/quiz.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { QuizQuestion } from '../models/QuizQuestion';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);

let woodyId: string;
let q1Id: string;
beforeEach(async () => {
  await clearDb();
  const woody = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  woodyId = String(woody._id);
  await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  const q = await QuizQuestion.create({
    order: 1, question: 'Pick a vibe',
    answers: [{ label: 'Warm woods', weights: { scentFamily: woody._id, value: 3 } }, { label: 'Fresh', weights: { value: 1 } }],
  });
  q1Id = String(q._id);
});

describe('GET /api/quiz', () => {
  it('returns questions with labels but NOT weights', async () => {
    const res = await request(app).get('/api/quiz');
    expect(res.status).toBe(200);
    expect(res.body[0].answers[0].label).toBe('Warm woods');
    expect(res.body[0].answers[0].weights).toBeUndefined();
  });
});

describe('POST /api/quiz/result', () => {
  it('recommends products from the accumulated scent-family weight', async () => {
    const res = await request(app).post('/api/quiz/result').send({ selections: [{ questionId: q1Id, answerIndex: 0 }] });
    expect(res.status).toBe(200);
    expect(res.body.scentFamily.id).toBe(woodyId);
    expect(res.body.recommended.length).toBeGreaterThan(0);
    expect(res.body.recommended[0].name).toBe('Royal Oud');
  });
  it('400s on a malformed selection', async () => {
    expect((await request(app).post('/api/quiz/result').send({ selections: [{ questionId: 'x', answerIndex: 0 }] })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- quiz.test`
Expected: FAIL — model / routes missing.

- [ ] **Step 3: Implement the model + serializers**

`apps/api/src/models/QuizQuestion.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { GENDER } from '@herencia/shared';

const answerSchema = new Schema(
  {
    label: { type: String, required: true },
    weights: {
      scentFamily: { type: Schema.Types.ObjectId, ref: 'ScentFamily' },
      gender: { type: String, enum: [...GENDER] },
      value: { type: Number, default: 1, min: 0 },
    },
  },
  { _id: false },
);

const quizQuestionSchema = new Schema(
  {
    order: { type: Number, default: 0, index: true },
    question: { type: String, required: true },
    answers: { type: [answerSchema], required: true },
  },
  { timestamps: true },
);

export type QuizQuestionDoc = InferSchemaType<typeof quizQuestionSchema>;
export const QuizQuestion =
  (mongoose.models.QuizQuestion as mongoose.Model<QuizQuestionDoc>) ?? mongoose.model('QuizQuestion', quizQuestionSchema);
```

Append to `apps/api/src/lib/serialize.ts` (add `QuizQuestionPublicDTO, QuizQuestionAdminDTO` to the shared import):
```ts
import type { QuizQuestionPublicDTO, QuizQuestionAdminDTO } from '@herencia/shared';

export function toQuizQuestionPublicDTO(doc: AnyDoc): QuizQuestionPublicDTO {
  return {
    id: String(doc._id),
    order: doc.order ?? 0,
    question: doc.question,
    answers: (doc.answers ?? []).map((a: AnyDoc) => ({ label: a.label })),
  };
}

export function toQuizQuestionAdminDTO(doc: AnyDoc): QuizQuestionAdminDTO {
  return {
    id: String(doc._id),
    order: doc.order ?? 0,
    question: doc.question,
    answers: (doc.answers ?? []).map((a: AnyDoc) => ({
      label: a.label,
      weights: {
        scentFamily: a.weights?.scentFamily ? String(a.weights.scentFamily) : undefined,
        gender: a.weights?.gender ?? undefined,
        value: a.weights?.value ?? 1,
      },
    })),
  };
}
```

- [ ] **Step 4: Implement the public quiz router + mount**

`apps/api/src/routes/quiz.ts`:
```ts
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
        const w = answer.weights ?? {};
        const value = w.value ?? 1;
        if (w.scentFamily) familyScore.set(String(w.scentFamily), (familyScore.get(String(w.scentFamily)) ?? 0) + value);
        if (w.gender) genderScore.set(String(w.gender), (genderScore.get(String(w.gender)) ?? 0) + value);
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
```

Mount in `apps/api/src/app.ts`:
```ts
import { quizRouter } from './routes/quiz';
// ...
app.use('/api', quizRouter());
```

- [ ] **Step 5: Run public quiz tests**

Run: `npm run test --workspace apps/api -- quiz.test`
Expected: PASS.

- [ ] **Step 6: Write the failing admin quiz tests**

`apps/api/src/routes/adminQuiz.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const valid = { order: 1, question: 'Day or night?', answers: [{ label: 'Day', weights: { value: 1 } }, { label: 'Night', weights: { value: 2 } }] };

describe('admin quiz', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/quiz').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates, returns weights to admin, lists, updates, deletes', async () => {
    const c = await request(app).post('/api/admin/quiz').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    expect(c.body.answers[1].weights.value).toBe(2);
    const id = c.body.id;
    const list = await request(app).get('/api/admin/quiz').set('Cookie', ADMIN);
    expect(list.body).toHaveLength(1);
    const u = await request(app).put(`/api/admin/quiz/${id}`).set('Cookie', ADMIN).send({ ...valid, question: 'Updated?' });
    expect(u.body.question).toBe('Updated?');
    const d = await request(app).delete(`/api/admin/quiz/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('rejects a question with one answer (400)', async () => {
    const res = await request(app).post('/api/admin/quiz').set('Cookie', ADMIN).send({ order: 1, question: 'q', answers: [{ label: 'only', weights: { value: 1 } }] });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/api -- adminQuiz`
Expected: FAIL — routes missing.

- [ ] **Step 8: Implement the admin quiz routes**

In `apps/api/src/routes/admin.ts` add imports:
```ts
import { quizQuestionSchema } from '@herencia/shared';
import { QuizQuestion } from '../models/QuizQuestion';
import { toQuizQuestionAdminDTO } from '../lib/serialize';
```
and routes inside `adminRouter()`:
```ts
// ---- Quiz ----
router.get('/quiz', async (_req, res, next) => {
  try {
    const docs = await QuizQuestion.find().sort({ order: 1 }).lean();
    res.json(docs.map(toQuizQuestionAdminDTO));
  } catch (err) {
    next(err);
  }
});
router.post('/quiz', async (req, res, next) => {
  try {
    const parsed = quizQuestionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const doc = await QuizQuestion.create(parsed.data);
    res.status(201).json(toQuizQuestionAdminDTO(doc.toObject()));
  } catch (err) {
    next(err);
  }
});
router.put('/quiz/:id', async (req, res, next) => {
  try {
    const parsed = quizQuestionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const doc = await QuizQuestion.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
    if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
    res.json(toQuizQuestionAdminDTO(doc));
  } catch (err) {
    next(err);
  }
});
router.delete('/quiz/:id', async (req, res, next) => {
  try {
    const doc = await QuizQuestion.findByIdAndDelete(req.params['id']).lean();
    if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 9: Run admin quiz tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- adminQuiz`
Expected: PASS.
Run: `npm run test --workspace apps/api && npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/QuizQuestion.ts apps/api/src/routes/quiz.ts apps/api/src/routes/quiz.test.ts apps/api/src/routes/adminQuiz.test.ts apps/api/src/lib/serialize.ts apps/api/src/routes/admin.ts apps/api/src/app.ts
git commit -m "feat(api): Find Your Scent quiz — public questions/result (weights server-only) + admin CRUD"
```

---

## Task 5: API — Banners (model, public by placement, admin CRUD)

**Files:**
- Create: `apps/api/src/models/Banner.ts`, `apps/api/src/routes/banners.ts`
- Modify: `apps/api/src/lib/serialize.ts` (`toBannerDTO`), `apps/api/src/routes/admin.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/routes/banners.test.ts`, `apps/api/src/routes/adminBanners.test.ts`

**Interfaces:**
- Consumes: `bannerSchema`, `BannerDTO`, `BANNER_PLACEMENT` (shared); `requireAdmin`.
- Produces:
  - `Banner` model.
  - `toBannerDTO(doc): BannerDTO`.
  - Public: `GET /api/banners?placement=` (active + within schedule window, ordered).
  - Admin: `GET/POST /api/admin/banners`, `PUT/DELETE /api/admin/banners/:id`.

- [ ] **Step 1: Write the failing public banners tests**

`apps/api/src/routes/banners.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Banner } from '../models/Banner';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('GET /api/banners', () => {
  it('returns only active banners within their schedule window, by placement, ordered', async () => {
    const now = Date.now();
    await Banner.create({ title: 'Live', image: 'x', placement: 'home_hero', isActive: true, order: 2 });
    await Banner.create({ title: 'First', image: 'x', placement: 'home_hero', isActive: true, order: 1 });
    await Banner.create({ title: 'Inactive', image: 'x', placement: 'home_hero', isActive: false, order: 0 });
    await Banner.create({ title: 'Future', image: 'x', placement: 'home_hero', isActive: true, startsAt: new Date(now + 1e7) });
    await Banner.create({ title: 'Expired', image: 'x', placement: 'home_hero', isActive: true, endsAt: new Date(now - 1e7) });
    await Banner.create({ title: 'OtherPlacement', image: 'x', placement: 'global_top', isActive: true });

    const res = await request(app).get('/api/banners?placement=home_hero');
    expect(res.status).toBe(200);
    expect(res.body.map((b: { title: string }) => b.title)).toEqual(['First', 'Live']);
  });
  it('returns all active current banners when no placement is given', async () => {
    await Banner.create({ title: 'A', image: 'x', placement: 'home_hero', isActive: true });
    await Banner.create({ title: 'B', image: 'x', placement: 'global_top', isActive: true });
    const res = await request(app).get('/api/banners');
    expect(res.body).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- banners.test`
Expected: FAIL.

- [ ] **Step 3: Implement model + serializer**

`apps/api/src/models/Banner.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { BANNER_PLACEMENT } from '@herencia/shared';

const bannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    image: { type: String, required: true },
    ctaText: { type: String },
    ctaLink: { type: String },
    placement: { type: String, enum: [...BANNER_PLACEMENT], required: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type BannerDoc = InferSchemaType<typeof bannerSchema>;
export const Banner =
  (mongoose.models.Banner as mongoose.Model<BannerDoc>) ?? mongoose.model('Banner', bannerSchema);
```

Append to `apps/api/src/lib/serialize.ts` (add `BannerDTO` to the shared import):
```ts
import type { BannerDTO } from '@herencia/shared';

export function toBannerDTO(doc: AnyDoc): BannerDTO {
  const iso = (d: unknown) => (d ? (d instanceof Date ? d : new Date(d as string)).toISOString() : undefined);
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle ?? undefined,
    image: doc.image,
    ctaText: doc.ctaText ?? undefined,
    ctaLink: doc.ctaLink ?? undefined,
    placement: doc.placement,
    startsAt: iso(doc.startsAt),
    endsAt: iso(doc.endsAt),
    isActive: !!doc.isActive,
    order: doc.order ?? 0,
  };
}
```

- [ ] **Step 4: Implement the public banners router + mount**

`apps/api/src/routes/banners.ts`:
```ts
import { Router } from 'express';
import { BANNER_PLACEMENT, type BannerPlacement } from '@herencia/shared';
import { Banner } from '../models/Banner';
import { HttpError } from '../middleware/error';
import { toBannerDTO } from '../lib/serialize';

export function bannerRouter(): Router {
  const router = Router();

  router.get('/banners', async (req, res, next) => {
    try {
      const now = new Date();
      const filter: Record<string, unknown> = {
        isActive: true,
        $and: [
          { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      };
      const placement = req.query['placement'];
      if (typeof placement === 'string') {
        if (!BANNER_PLACEMENT.includes(placement as BannerPlacement)) throw new HttpError(400, 'Invalid placement', 'invalid');
        filter['placement'] = placement;
      }
      const docs = await Banner.find(filter).sort({ order: 1, createdAt: -1 }).lean();
      res.json(docs.map(toBannerDTO));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

Mount in `apps/api/src/app.ts`:
```ts
import { bannerRouter } from './routes/banners';
// ...
app.use('/api', bannerRouter());
```

- [ ] **Step 5: Run public banners tests**

Run: `npm run test --workspace apps/api -- banners.test`
Expected: PASS.

- [ ] **Step 6: Write the failing admin banners tests**

`apps/api/src/routes/adminBanners.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const valid = { title: 'Summer Sale', image: 'banners/summer', placement: 'home_hero', order: 1 };

describe('admin banners', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/banners').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates, lists (incl inactive), updates, deletes', async () => {
    const c = await request(app).post('/api/admin/banners').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    const id = c.body.id;
    const list = await request(app).get('/api/admin/banners').set('Cookie', ADMIN);
    expect(list.body).toHaveLength(1);
    const u = await request(app).put(`/api/admin/banners/${id}`).set('Cookie', ADMIN).send({ ...valid, isActive: false });
    expect(u.body.isActive).toBe(false);
    const d = await request(app).delete(`/api/admin/banners/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('rejects an invalid placement (400)', async () => {
    const res = await request(app).post('/api/admin/banners').set('Cookie', ADMIN).send({ ...valid, placement: 'nope' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/api -- adminBanners`
Expected: FAIL.

- [ ] **Step 8: Implement the admin banners routes**

In `apps/api/src/routes/admin.ts` add imports:
```ts
import { bannerSchema } from '@herencia/shared';
import { Banner } from '../models/Banner';
import { toBannerDTO } from '../lib/serialize';
```
and routes inside `adminRouter()`:
```ts
// ---- Banners ----
router.get('/banners', async (_req, res, next) => {
  try {
    const docs = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(docs.map(toBannerDTO));
  } catch (err) {
    next(err);
  }
});
router.post('/banners', async (req, res, next) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const doc = await Banner.create(parsed.data);
    res.status(201).json(toBannerDTO(doc.toObject()));
  } catch (err) {
    next(err);
  }
});
router.put('/banners/:id', async (req, res, next) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const doc = await Banner.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
    if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
    res.json(toBannerDTO(doc));
  } catch (err) {
    next(err);
  }
});
router.delete('/banners/:id', async (req, res, next) => {
  try {
    const doc = await Banner.findByIdAndDelete(req.params['id']).lean();
    if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 9: Run admin banners tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- adminBanners`
Expected: PASS.
Run: `npm run test --workspace apps/api && npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/Banner.ts apps/api/src/routes/banners.ts apps/api/src/routes/banners.test.ts apps/api/src/routes/adminBanners.test.ts apps/api/src/lib/serialize.ts apps/api/src/routes/admin.ts apps/api/src/app.ts
git commit -m "feat(api): scheduled offer banners (public by placement) + admin CRUD"
```

---

## Task 6: API — Blog (model, public list/detail, admin CRUD)

**Files:**
- Create: `apps/api/src/models/BlogPost.ts`, `apps/api/src/routes/blog.ts`
- Modify: `apps/api/src/lib/serialize.ts` (`toBlogPostDTO`, `toBlogListItemDTO`), `apps/api/src/routes/admin.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/routes/blog.test.ts`, `apps/api/src/routes/adminBlog.test.ts`

**Interfaces:**
- Consumes: `blogPostSchema`, `BlogPostDTO`, `BlogPostListItemDTO`, `BlogListDTO`, `slugify` (shared); `requireAdmin`.
- Produces:
  - `BlogPost` model (`slug` unique; `publishedAt` set when first published).
  - `toBlogPostDTO` (full), `toBlogListItemDTO` (no body).
  - Public: `GET /api/blog?page=&tag=` (published only), `GET /api/blog/:slug` (published only).
  - Admin: `GET/POST /api/admin/blog`, `PUT/DELETE /api/admin/blog/:id`.

- [ ] **Step 1: Write the failing public blog tests**

`apps/api/src/routes/blog.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { BlogPost } from '../models/BlogPost';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function post(over: Record<string, unknown> = {}) {
  return BlogPost.create({
    title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer', body: '# Oud body',
    coverImage: 'blog/oud', tags: ['oud'], isPublished: true, publishedAt: new Date(), ...over,
  });
}

describe('GET /api/blog', () => {
  it('lists published posts without the full body', async () => {
    await post();
    await post({ slug: 'draft', title: 'Draft', isPublished: false, publishedAt: undefined });
    const res = await request(app).get('/api/blog');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].slug).toBe('notes-on-oud');
    expect(res.body.items[0].body).toBeUndefined();
  });
  it('filters by tag', async () => {
    await post();
    await post({ slug: 'fresh', title: 'Fresh', tags: ['citrus'] });
    const res = await request(app).get('/api/blog?tag=citrus');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].slug).toBe('fresh');
  });
});

describe('GET /api/blog/:slug', () => {
  it('returns a published post with its body', async () => {
    await post();
    const res = await request(app).get('/api/blog/notes-on-oud');
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('# Oud body');
  });
  it('404s a draft', async () => {
    await post({ slug: 'draft', isPublished: false, publishedAt: undefined });
    expect((await request(app).get('/api/blog/draft')).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- blog.test`
Expected: FAIL.

- [ ] **Step 3: Implement model + serializers**

`apps/api/src/models/BlogPost.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    coverImage: { type: String, required: true },
    tags: { type: [String], default: [], index: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    seo: { title: { type: String }, description: { type: String } },
  },
  { timestamps: true },
);

export type BlogPostDoc = InferSchemaType<typeof blogPostSchema>;
export const BlogPost =
  (mongoose.models.BlogPost as mongoose.Model<BlogPostDoc>) ?? mongoose.model('BlogPost', blogPostSchema);
```

Append to `apps/api/src/lib/serialize.ts` (add `BlogPostDTO, BlogPostListItemDTO` to the shared import):
```ts
import type { BlogPostDTO, BlogPostListItemDTO } from '@herencia/shared';

export function toBlogPostDTO(doc: AnyDoc): BlogPostDTO {
  const iso = (d: unknown) => (d ? (d instanceof Date ? d : new Date(d as string)).toISOString() : undefined);
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    body: doc.body,
    coverImage: doc.coverImage,
    tags: doc.tags ?? [],
    isPublished: !!doc.isPublished,
    publishedAt: iso(doc.publishedAt),
    seo: { title: doc.seo?.title ?? undefined, description: doc.seo?.description ?? undefined },
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}

export function toBlogListItemDTO(doc: AnyDoc): BlogPostListItemDTO {
  const { body, ...rest } = toBlogPostDTO(doc);
  void body;
  return rest;
}
```

- [ ] **Step 4: Implement the public blog router + mount**

`apps/api/src/routes/blog.ts`:
```ts
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
```

Mount in `apps/api/src/app.ts`:
```ts
import { blogRouter } from './routes/blog';
// ...
app.use('/api', blogRouter());
```

- [ ] **Step 5: Run public blog tests**

Run: `npm run test --workspace apps/api -- blog.test`
Expected: PASS.

- [ ] **Step 6: Write the failing admin blog tests**

`apps/api/src/routes/adminBlog.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const valid = { title: 'Notes on Oud', excerpt: 'A primer', body: '# Oud', coverImage: 'blog/oud', tags: ['oud'], isPublished: true };

describe('admin blog', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/blog').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates (auto-slug + publishedAt), lists incl drafts, updates, deletes', async () => {
    const c = await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    expect(c.body.slug).toBe('notes-on-oud');
    expect(c.body.publishedAt).toBeTruthy();
    const id = c.body.id;
    const list = await request(app).get('/api/admin/blog').set('Cookie', ADMIN);
    expect(list.body.items ?? list.body).toBeTruthy();
    const u = await request(app).put(`/api/admin/blog/${id}`).set('Cookie', ADMIN).send({ ...valid, title: 'Updated Oud' });
    expect(u.body.title).toBe('Updated Oud');
    const d = await request(app).delete(`/api/admin/blog/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('409s a duplicate slug', async () => {
    await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    const res = await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/api -- adminBlog`
Expected: FAIL.

- [ ] **Step 8: Implement the admin blog routes**

In `apps/api/src/routes/admin.ts` add imports:
```ts
import { blogPostSchema } from '@herencia/shared';
import { BlogPost } from '../models/BlogPost';
import { toBlogPostDTO } from '../lib/serialize';
```
(`slugify` is already imported at the top of admin.ts.) Add routes inside `adminRouter()`:
```ts
// ---- Blog ----
router.get('/blog', async (_req, res, next) => {
  try {
    const docs = await BlogPost.find().sort({ createdAt: -1 }).lean();
    res.json({ items: docs.map(toBlogPostDTO), total: docs.length, page: 1, pages: 1 });
  } catch (err) {
    next(err);
  }
});
router.post('/blog', async (req, res, next) => {
  try {
    const parsed = blogPostSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const data = parsed.data;
    const doc = await BlogPost.create({
      ...data,
      slug: data.slug ? slugify(data.slug) : slugify(data.title),
      publishedAt: data.isPublished ? new Date() : undefined,
    });
    res.status(201).json(toBlogPostDTO(doc.toObject()));
  } catch (err) {
    next(err);
  }
});
router.put('/blog/:id', async (req, res, next) => {
  try {
    const parsed = blogPostSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const data = parsed.data;
    const existing = await BlogPost.findById(req.params['id']);
    if (!existing) throw new HttpError(404, 'Post not found', 'not_found');
    // Set publishedAt the first time it transitions to published.
    const publishedAt = data.isPublished ? (existing.publishedAt ?? new Date()) : undefined;
    existing.set({ ...data, slug: data.slug ? slugify(data.slug) : slugify(data.title), publishedAt });
    await existing.save();
    res.json(toBlogPostDTO(existing.toObject()));
  } catch (err) {
    next(err);
  }
});
router.delete('/blog/:id', async (req, res, next) => {
  try {
    const doc = await BlogPost.findByIdAndDelete(req.params['id']).lean();
    if (!doc) throw new HttpError(404, 'Post not found', 'not_found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 9: Run admin blog tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- adminBlog`
Expected: PASS.
Run: `npm run test --workspace apps/api && npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/BlogPost.ts apps/api/src/routes/blog.ts apps/api/src/routes/blog.test.ts apps/api/src/routes/adminBlog.test.ts apps/api/src/lib/serialize.ts apps/api/src/routes/admin.ts apps/api/src/app.ts
git commit -m "feat(api): blog posts (public list/detail) + admin CRUD"
```

---

## Task 7: API — Blog SEO (Article meta + sitemap)

**Files:**
- Modify: `apps/api/src/lib/seo.ts` (blog branch in `routeMetaForPath`; `articleJsonLd`; `buildSitemap` blog slugs)
- Modify: `apps/api/src/app.ts` (pass published blog slugs to the sitemap)
- Test: `apps/api/src/lib/seo.test.ts` (extend)

**Interfaces:**
- Consumes: `BlogPost` model; existing `RouteMeta`, `toAbsoluteImageUrl`, `escapeHtml`.
- Produces:
  - `articleJsonLd(post, canonical): string`.
  - `routeMetaForPath` now resolves `/blog/:slug` → title/description/og:image + Article JSON-LD.
  - `buildSitemap(origin, products, blogSlugs?: string[])` — appends `/blog/:slug` URLs (and `/blog`).

- [ ] **Step 1: Write the failing SEO tests**

Append to `apps/api/src/lib/seo.test.ts` (it already uses the in-memory DB harness; if not, mirror the existing setup — check the file and reuse its `connectMemory`/`clearDb` pattern):
```ts
import { BlogPost } from '../models/BlogPost';
import { routeMetaForPath, buildSitemap } from './seo';

describe('blog SEO', () => {
  it('builds Article meta + JSON-LD for a published post', async () => {
    await BlogPost.create({
      title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer on oud', body: '# Oud',
      coverImage: 'blog/oud', tags: ['oud'], isPublished: true, publishedAt: new Date(),
    });
    const meta = await routeMetaForPath('/blog/notes-on-oud');
    expect(meta.title).toContain('Notes on Oud');
    expect(meta.description).toBe('A primer on oud');
    expect(meta.jsonLd).toContain('"@type":"Article"');
    expect(meta.canonicalPath).toBe('/blog/notes-on-oud');
  });
  it('omits a draft post from sitemap helper input and falls back to default meta', async () => {
    const meta = await routeMetaForPath('/blog/does-not-exist');
    expect(meta.title).toContain('HERENCIA');
  });
  it('includes blog slugs in the sitemap', () => {
    const xml = buildSitemap('https://h.test', [{ slug: 'royal-oud', type: 'perfume' }], ['notes-on-oud']);
    expect(xml).toContain('https://h.test/blog/notes-on-oud');
    expect(xml).toContain('https://h.test/blog');
  });
});
```
> Note: if `seo.test.ts` does not currently connect to the in-memory DB (the M1 version may test only pure helpers), add `beforeAll(connectMemory); afterAll(disconnectMemory); beforeEach(clearDb);` and the imports from `../test/db` at the top of the new `describe` setup, matching the harness used by `catalog.test.ts`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- seo`
Expected: FAIL — no blog branch / sitemap arg.

- [ ] **Step 3: Implement**

In `apps/api/src/lib/seo.ts`:
- Add the import: `import { BlogPost } from '../models/BlogPost';`
- Add `articleJsonLd`:
```ts
export function articleJsonLd(post: { title: string; excerpt: string; coverImage: string; publishedAt?: string }, canonical: string): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: toAbsoluteImageUrl(post.coverImage),
    url: canonical,
    publisher: { '@type': 'Organization', name: BRAND },
  };
  if (post.publishedAt) data.datePublished = post.publishedAt;
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```
- In `routeMetaForPath`, after the product `detail` block and before `STATIC_META`, add the blog branch:
```ts
const blog = clean.match(/^\/blog\/([^/]+)$/);
if (blog) {
  const slug = blog[1]!;
  const doc = await BlogPost.findOne({ slug, isPublished: true }).lean();
  if (doc) {
    const canonical = `/blog/${slug}`;
    return {
      title: doc.seo?.title ?? `${doc.title} — ${BRAND}`,
      description: doc.seo?.description ?? doc.excerpt,
      canonicalPath: canonical,
      image: toAbsoluteImageUrl(doc.coverImage),
      jsonLd: articleJsonLd(
        { title: doc.title, excerpt: doc.excerpt, coverImage: doc.coverImage, publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : undefined },
        canonical,
      ),
    };
  }
}
```
- Also add `/blog` to `STATIC_META`: `'/blog': { title: \`Journal — ${BRAND}\`, description: 'Notes on scent, heritage, and craft from HERENCIA.' },`
- Change `buildSitemap` to accept blog slugs:
```ts
export function buildSitemap(origin: string, products: { slug: string; type: string }[], blogSlugs: string[] = []): string {
  const staticPaths = ['/', '/products', '/bundles', '/blog', '/about', '/contact'];
  const urls = [
    ...staticPaths.map((p) => `${origin}${p}`),
    ...products.map((p) => `${origin}/${p.type === 'bundle' ? 'bundles' : 'products'}/${p.slug}`),
    ...blogSlugs.map((s) => `${origin}/blog/${s}`),
  ];
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
```

In `apps/api/src/app.ts`, the `/sitemap.xml` handler must fetch published blog slugs and pass them:
```ts
import { BlogPost } from './models/BlogPost';
// in the /sitemap.xml handler, alongside the products query:
const [products, posts] = await Promise.all([
  Product.find({ isActive: true }).select('slug type').lean(),
  BlogPost.find({ isPublished: true }).select('slug').lean(),
]);
res
  .type('application/xml')
  .send(buildSitemap(origin, products.map((p) => ({ slug: p.slug, type: p.type })), posts.map((p) => p.slug)));
```

- [ ] **Step 4: Run the SEO tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- seo`
Expected: PASS.
Run: `npm run test --workspace apps/api && npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/seo.ts apps/api/src/lib/seo.test.ts apps/api/src/app.ts
git commit -m "feat(api): blog SEO — Article JSON-LD + per-post head + sitemap entries"
```

---

## Task 8: Web — Reviews (product detail section + admin moderation)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (`fetchReviews`, `submitReview`), `apps/web/src/features/admin/adminClient.ts` (`adminFetchReviews`, `adminModerateReview`, `adminDeleteReview`)
- Create: `apps/web/src/features/reviews/ReviewsSection.tsx`, `apps/web/src/pages/admin/AdminReviews.tsx`
- Modify: `apps/web/src/pages/ProductDetail.tsx` (render `<ReviewsSection slug productId>`), `apps/web/src/pages/admin/AdminApp.tsx` (Reviews nav + route)
- Test: `apps/web/src/features/reviews/ReviewsSection.test.tsx`

**Interfaces:**
- Consumes: `ReviewDTO`, `CreateReviewInput`, `UpdateReviewInput` (shared); `useAuth`; React Query; `Rating` component (`apps/web/src/components/Rating.tsx`).
- Produces:
  - api client: `fetchReviews(slug, page?)` → `{items:ReviewDTO[];total;page;pages}`; `submitReview(slug, input)` → `ReviewDTO`.
  - admin client: `adminFetchReviews(status?)`, `adminModerateReview(id, isApproved)`, `adminDeleteReview(id)`.
  - `<ReviewsSection slug productId />` — lists approved reviews + a submit form for logged-in users (guests see a "sign in to review" link).
  - `<AdminReviews />` page (moderation queue) wired into AdminApp.

- [ ] **Step 1: Add the client fns**

Append to `apps/web/src/lib/api.ts` (extend the shared import with `ReviewDTO, CreateReviewInput`):
```ts
export const fetchReviews = (slug: string, page = 1) =>
  apiGet<{ items: ReviewDTO[]; total: number; page: number; pages: number }>(`/api/products/${slug}/reviews?page=${page}`);
export const submitReview = (slug: string, input: CreateReviewInput) =>
  apiSend<ReviewDTO>('POST', `/api/products/${slug}/reviews`, input);
```
Append to `apps/web/src/features/admin/adminClient.ts` (add `import type { ReviewDTO } from '@herencia/shared'`):
```ts
export const adminFetchReviews = (status?: 'pending' | 'approved') =>
  apiGet<{ items: ReviewDTO[]; total: number; page: number; pages: number }>(`/api/admin/reviews${status ? `?status=${status}` : ''}`);
export const adminModerateReview = (id: string, isApproved: boolean) =>
  apiSend<ReviewDTO>('PUT', `/api/admin/reviews/${id}`, { isApproved });
export const adminDeleteReview = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/reviews/${id}`);
```

- [ ] **Step 2: Write the failing ReviewsSection test**

`apps/web/src/features/reviews/ReviewsSection.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewsSection } from './ReviewsSection';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../lib/api';

function wrap(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ReviewsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
  });
  it('renders approved reviews and a sign-in prompt for guests', async () => {
    vi.spyOn(api, 'fetchReviews').mockResolvedValue({
      items: [{ id: '1', productId: 'p', user: { id: 'u', name: 'Mai' }, rating: 5, body: 'Wonderful', isApproved: true, createdAt: '2026-07-01T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<ReviewsSection slug="royal-oud" productId="p" />));
    await waitFor(() => expect(screen.getByText('Wonderful')).toBeInTheDocument());
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- ReviewsSection`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement ReviewsSection + AdminReviews + wiring**

`apps/web/src/features/reviews/ReviewsSection.tsx` (default-less named export): `useQuery(['reviews', slug], () => fetchReviews(slug))` to list approved reviews (each: `Rating` stars + name + title + body). Below the list: if `useAuth().user` is null, render a `<Link to="/login">Sign in to write a review</Link>`; otherwise a controlled form (rating select 1–5, optional title, body textarea) that calls a `useMutation(submitReview(slug, …))`, invalidates `['reviews', slug]` on success, and surfaces an `ApiError` message (e.g. the 409 "already reviewed"). Show a "pending moderation" note after submit. Use brand tokens + semantic `<section>` with an `<h2>`.

`apps/web/src/pages/admin/AdminReviews.tsx` (default export): `useQuery(['admin-reviews', status], () => adminFetchReviews(status))` with a pending/approved/all filter; each row shows product id, user name, rating, body, and Approve/Unapprove + Delete buttons calling `adminModerateReview`/`adminDeleteReview` via mutations that invalidate `['admin-reviews']`.

Wire into `apps/web/src/pages/admin/AdminApp.tsx`: add a "Reviews" nav link + `<Route path="/reviews" element={<AdminReviews />} />` (mirror the existing Orders wiring).

Render in `apps/web/src/pages/ProductDetail.tsx`: import and place `<ReviewsSection slug={product.slug} productId={product.id} />` below the product details (the page already has the product DTO).

- [ ] **Step 5: Run the web suite + typecheck + lint + build**

Run: `npm run test --workspace apps/web -- ReviewsSection`
Expected: PASS.
Run: `npm run test --workspace apps/web && npm run typecheck && npm run lint && npm run build`
Expected: all clean. (If the existing `ProductDetail.test.tsx` now renders `ReviewsSection` which calls `useQuery`/`useAuth`, wrap it in `QueryClientProvider` + `AuthProvider` minimally and mock `fetchReviews`.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/admin/adminClient.ts apps/web/src/features/reviews apps/web/src/pages/admin/AdminReviews.tsx apps/web/src/pages/ProductDetail.tsx apps/web/src/pages/admin/AdminApp.tsx apps/web/src/pages/ProductDetail.test.tsx
git commit -m "feat(web): product reviews section + admin moderation queue"
```

---

## Task 9: Web — Find Your Scent quiz (flow + results + admin config)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (`fetchQuiz`, `submitQuizResult`), `apps/web/src/features/admin/adminClient.ts` (`adminFetchQuiz`, `adminCreateQuestion`, `adminUpdateQuestion`, `adminDeleteQuestion`)
- Create: `apps/web/src/pages/FindYourScent.tsx`, `apps/web/src/pages/admin/AdminQuiz.tsx`
- Modify: `apps/web/src/app/router.tsx` (`/find-your-scent`), `apps/web/src/app/StorefrontLayout.tsx` (nav link), `apps/web/src/pages/admin/AdminApp.tsx` (Quiz nav + route)
- Test: `apps/web/src/pages/FindYourScent.test.tsx`

**Interfaces:**
- Consumes: `QuizQuestionPublicDTO`, `QuizResultDTO`, `QuizResultInput`, `QuizQuestionAdminDTO`, `QuizQuestionInput` (shared); `ProductCard`.
- Produces:
  - api client: `fetchQuiz()` → `QuizQuestionPublicDTO[]`; `submitQuizResult(input)` → `QuizResultDTO`.
  - admin client: `adminFetchQuiz()`, `adminCreateQuestion(input)`, `adminUpdateQuestion(id, input)`, `adminDeleteQuestion(id)`.
  - `<FindYourScent />` quiz page; `<AdminQuiz />` config page.

- [ ] **Step 1: Add the client fns**

Append to `apps/web/src/lib/api.ts` (extend import with `QuizQuestionPublicDTO, QuizResultDTO, QuizResultInput`):
```ts
export const fetchQuiz = () => apiGet<QuizQuestionPublicDTO[]>('/api/quiz');
export const submitQuizResult = (input: QuizResultInput) => apiSend<QuizResultDTO>('POST', '/api/quiz/result', input);
```
Append to `apps/web/src/features/admin/adminClient.ts` (add `QuizQuestionAdminDTO, QuizQuestionInput` to the type import):
```ts
export const adminFetchQuiz = () => apiGet<QuizQuestionAdminDTO[]>('/api/admin/quiz');
export const adminCreateQuestion = (input: QuizQuestionInput) => apiSend<QuizQuestionAdminDTO>('POST', '/api/admin/quiz', input);
export const adminUpdateQuestion = (id: string, input: QuizQuestionInput) => apiSend<QuizQuestionAdminDTO>('PUT', `/api/admin/quiz/${id}`, input);
export const adminDeleteQuestion = (id: string) => apiSend<void>('DELETE', `/api/admin/quiz/${id}`);
```

- [ ] **Step 2: Write the failing FindYourScent test**

`apps/web/src/pages/FindYourScent.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FindYourScent from './FindYourScent';
import * as api from '../lib/api';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

const product = {
  id: 'p1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 's', description: 'd',
  images: ['x'], basePrice: 800, scentFamily: null, notes: { top: [], heart: [], base: [] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 0, count: 0 }, isFeatured: false, isActive: true, seo: {},
  sizes: [{ label: '50ml', price: 800, stock: 5 }],
};

describe('FindYourScent', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('walks a question and shows recommendations', async () => {
    vi.spyOn(api, 'fetchQuiz').mockResolvedValue([{ id: 'q1', order: 1, question: 'Pick a vibe', answers: [{ label: 'Warm woods' }, { label: 'Fresh' }] }]);
    const submit = vi.spyOn(api, 'submitQuizResult').mockResolvedValue({ scentFamily: null, gender: null, recommended: [product as never] });
    render(wrap(<FindYourScent />));
    await waitFor(() => expect(screen.getByText('Pick a vibe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Warm woods' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ selections: [{ questionId: 'q1', answerIndex: 0 }] }));
    await waitFor(() => expect(screen.getByText('Royal Oud')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- FindYourScent`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement FindYourScent + AdminQuiz + wiring**

`apps/web/src/pages/FindYourScent.tsx` (default export): `useQuery(['quiz'], fetchQuiz)`. Render one question at a time; each answer is a `<button>` with the answer label. Track `selections: {questionId, answerIndex}[]` in state; on the last answer, call a `useMutation(submitQuizResult)` and render the result — a heading ("Your scent profile") + the recommended `ProductCard` grid (and the scent-family name if present). Provide a "start over" button. Use brand tokens + semantic headings.

`apps/web/src/pages/admin/AdminQuiz.tsx` (default export): `useQuery(['admin-quiz'], adminFetchQuiz)`; list questions with their answers + weights; a form to create a question (question text, order, 2–8 answers each with label + optional scentFamily select [from `fetchScentFamilies`] + optional gender + value), and edit/delete. Mutations invalidate `['admin-quiz']`. This is a denser admin form — keep it functional, not fancy.

Wire: `apps/web/src/app/router.tsx` add lazy `{ path: '/find-your-scent', element: <FindYourScent /> }` under `StorefrontLayout`; `apps/web/src/app/StorefrontLayout.tsx` add a "Find Your Scent" nav link; `apps/web/src/pages/admin/AdminApp.tsx` add "Quiz" nav + `<Route path="/quiz" element={<AdminQuiz />} />`.

- [ ] **Step 5: Run the web suite + typecheck + lint + build**

Run: `npm run test --workspace apps/web -- FindYourScent`
Expected: PASS.
Run: `npm run test --workspace apps/web && npm run typecheck && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/admin/adminClient.ts apps/web/src/pages/FindYourScent.tsx apps/web/src/pages/admin/AdminQuiz.tsx apps/web/src/app/router.tsx apps/web/src/app/StorefrontLayout.tsx apps/web/src/pages/admin/AdminApp.tsx
git commit -m "feat(web): Find Your Scent quiz flow + results + admin question config"
```

---

## Task 10: Web — Banners (render + admin)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (`fetchBanners`), `apps/web/src/features/admin/adminClient.ts` (`adminFetchBanners`, `adminCreateBanner`, `adminUpdateBanner`, `adminDeleteBanner`)
- Create: `apps/web/src/components/BannerStrip.tsx`, `apps/web/src/pages/admin/AdminBanners.tsx`
- Modify: `apps/web/src/pages/Home.tsx` (hero + strip banners), `apps/web/src/app/StorefrontLayout.tsx` (global_top), `apps/web/src/pages/admin/AdminApp.tsx` (Banners nav + route)
- Test: `apps/web/src/components/BannerStrip.test.tsx`

**Interfaces:**
- Consumes: `BannerDTO`, `BannerInput`, `BannerPlacement` (shared); `ProductImage`/`cld` helper (`apps/web/src/lib/cloudinary.ts`).
- Produces:
  - api client: `fetchBanners(placement?)` → `BannerDTO[]`.
  - admin client: `adminFetchBanners()`, `adminCreateBanner(input)`, `adminUpdateBanner(id, input)`, `adminDeleteBanner(id)`.
  - `<BannerStrip placement />` — fetches + renders active banners for a placement (null when none).
  - `<AdminBanners />` page.

- [ ] **Step 1: Add the client fns**

Append to `apps/web/src/lib/api.ts` (extend import with `BannerDTO, BannerPlacement`):
```ts
export const fetchBanners = (placement?: BannerPlacement) =>
  apiGet<BannerDTO[]>(`/api/banners${placement ? `?placement=${placement}` : ''}`);
```
Append to `apps/web/src/features/admin/adminClient.ts` (add `BannerDTO, BannerInput` to the type import):
```ts
export const adminFetchBanners = () => apiGet<BannerDTO[]>('/api/admin/banners');
export const adminCreateBanner = (input: BannerInput) => apiSend<BannerDTO>('POST', '/api/admin/banners', input);
export const adminUpdateBanner = (id: string, input: BannerInput) => apiSend<BannerDTO>('PUT', `/api/admin/banners/${id}`, input);
export const adminDeleteBanner = (id: string) => apiSend<void>('DELETE', `/api/admin/banners/${id}`);
```

- [ ] **Step 2: Write the failing BannerStrip test**

`apps/web/src/components/BannerStrip.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BannerStrip } from './BannerStrip';
import * as api from '../lib/api';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

describe('BannerStrip', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders active banners for a placement', async () => {
    vi.spyOn(api, 'fetchBanners').mockResolvedValue([
      { id: '1', title: 'Summer Sale', image: 'banners/summer', placement: 'home_hero', isActive: true, order: 1 },
    ]);
    render(wrap(<BannerStrip placement="home_hero" />));
    await waitFor(() => expect(screen.getByText('Summer Sale')).toBeInTheDocument());
  });
  it('renders nothing when there are no banners', async () => {
    vi.spyOn(api, 'fetchBanners').mockResolvedValue([]);
    const { container } = render(wrap(<BannerStrip placement="global_top" />));
    await waitFor(() => expect(api.fetchBanners).toHaveBeenCalled());
    expect(container.querySelector('[data-banner]')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- BannerStrip`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement BannerStrip + AdminBanners + wiring**

`apps/web/src/components/BannerStrip.tsx` (named export): `useQuery(['banners', placement], () => fetchBanners(placement))`. Returns `null` when the list is empty/loading. Otherwise renders each banner (image via the `cld()` cloudinary helper, title, optional subtitle, and a CTA `<Link>`/anchor to `ctaLink` when present) inside an element carrying `data-banner`. Style varies lightly by placement (hero = large; strip/global_top = compact bar) but keep it simple. Image needs `alt={banner.title}`.

`apps/web/src/pages/admin/AdminBanners.tsx` (default export): `useQuery(['admin-banners'], adminFetchBanners)` listing ALL banners (active + inactive) with placement/schedule/active shown; a create/edit form (title, subtitle, image upload via the existing `uploadImage` helper, placement select from `BANNER_PLACEMENT`, ctaText/ctaLink, startsAt/endsAt datetime-local, isActive, order) and delete. Mutations invalidate `['admin-banners']`.

Wire: `apps/web/src/pages/Home.tsx` render `<BannerStrip placement="home_hero" />` near the top and `<BannerStrip placement="home_strip" />` lower; `apps/web/src/app/StorefrontLayout.tsx` render `<BannerStrip placement="global_top" />` just under the header; `apps/web/src/pages/admin/AdminApp.tsx` add "Banners" nav + `<Route path="/banners" element={<AdminBanners />} />`.

- [ ] **Step 5: Run the web suite + typecheck + lint + build**

Run: `npm run test --workspace apps/web -- BannerStrip`
Expected: PASS.
Run: `npm run test --workspace apps/web && npm run typecheck && npm run lint && npm run build`
Expected: all clean. (StorefrontLayout/Home now use `useQuery`; if any existing test renders them without a `QueryClientProvider`, wrap it minimally + mock `fetchBanners` to `[]`.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/admin/adminClient.ts apps/web/src/components/BannerStrip.tsx apps/web/src/components/BannerStrip.test.tsx apps/web/src/pages/admin/AdminBanners.tsx apps/web/src/pages/Home.tsx apps/web/src/app/StorefrontLayout.tsx apps/web/src/pages/admin/AdminApp.tsx
git commit -m "feat(web): render scheduled banners by placement + admin banner CRUD"
```

---

## Task 11: Web — Blog (index + post + admin)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (`fetchBlogList`, `fetchBlogPost`), `apps/web/src/features/admin/adminClient.ts` (`adminFetchBlog`, `adminCreateBlogPost`, `adminUpdateBlogPost`, `adminDeleteBlogPost`)
- Create: `apps/web/src/pages/Blog.tsx`, `apps/web/src/pages/BlogPost.tsx`, `apps/web/src/pages/admin/AdminBlog.tsx`
- Modify: `apps/web/src/app/router.tsx` (`/blog`, `/blog/:slug`), `apps/web/src/app/StorefrontLayout.tsx` (Blog nav), `apps/web/src/pages/admin/AdminApp.tsx` (Blog nav + route)
- Test: `apps/web/src/pages/BlogPost.test.tsx`

**Interfaces:**
- Consumes: `BlogListDTO`, `BlogPostDTO`, `BlogPostInput` (shared); `useSeo` (`apps/web/src/lib/useSeo.ts`); `ProductImage`/`cld`.
- Produces:
  - api client: `fetchBlogList(page?, tag?)` → `BlogListDTO`; `fetchBlogPost(slug)` → `BlogPostDTO`.
  - admin client: `adminFetchBlog()` → `{items:BlogPostDTO[];...}`, `adminCreateBlogPost(input)`, `adminUpdateBlogPost(id, input)`, `adminDeleteBlogPost(id)`.
  - `<Blog />` index, `<BlogPost />` detail (sets `useSeo` from the post), `<AdminBlog />` editor.

- [ ] **Step 1: Add the client fns**

Append to `apps/web/src/lib/api.ts` (extend import with `BlogListDTO, BlogPostDTO`):
```ts
export const fetchBlogList = (page = 1, tag?: string) =>
  apiGet<BlogListDTO>(`/api/blog?page=${page}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`);
export const fetchBlogPost = (slug: string) => apiGet<BlogPostDTO>(`/api/blog/${slug}`);
```
Append to `apps/web/src/features/admin/adminClient.ts` (add `BlogPostDTO, BlogPostInput` to the type import):
```ts
export const adminFetchBlog = () => apiGet<{ items: BlogPostDTO[]; total: number; page: number; pages: number }>('/api/admin/blog');
export const adminCreateBlogPost = (input: BlogPostInput) => apiSend<BlogPostDTO>('POST', '/api/admin/blog', input);
export const adminUpdateBlogPost = (id: string, input: BlogPostInput) => apiSend<BlogPostDTO>('PUT', `/api/admin/blog/${id}`, input);
export const adminDeleteBlogPost = (id: string) => apiSend<void>('DELETE', `/api/admin/blog/${id}`);
```

- [ ] **Step 2: Write the failing BlogPost test**

`apps/web/src/pages/BlogPost.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BlogPost from './BlogPost';
import * as api from '../lib/api';

function wrap(slug: string) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes><Route path="/blog/:slug" element={<BlogPost />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BlogPost', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders the post title and body', async () => {
    vi.spyOn(api, 'fetchBlogPost').mockResolvedValue({
      id: '1', title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer', body: 'Oud is deep and woody.',
      coverImage: 'blog/oud', tags: ['oud'], isPublished: true, seo: {}, createdAt: '2026-07-01T00:00:00Z',
    });
    render(wrap('notes-on-oud'));
    await waitFor(() => expect(screen.getByText('Notes on Oud')).toBeInTheDocument());
    expect(screen.getByText(/deep and woody/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- BlogPost`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement Blog + BlogPost + AdminBlog + wiring**

`apps/web/src/pages/Blog.tsx` (default export): `useQuery(['blog', page, tag], () => fetchBlogList(page, tag))`; render a grid of post cards (cover image via `cld`, title `<Link to={'/blog/'+slug}>`, excerpt, tags, date). `useSeo({ title: 'Journal — HERENCIA', description: 'Notes on scent, heritage, and craft.' })`. Semantic `<main>`/`<article>` cards.

`apps/web/src/pages/BlogPost.tsx` (default export): read `useParams().slug`; `useQuery(['blog', slug], () => fetchBlogPost(slug))`; render `<article>` with `<h1>{title}</h1>`, cover image (`alt={title}`), and the body. Render the markdown body as plain text/preformatted paragraphs (do NOT add a markdown lib — split on blank lines into `<p>`; YAGNI — a real markdown renderer is an M4 enhancement). Call `useSeo({ title: post.seo.title ?? post.title + ' — HERENCIA', description: post.seo.description ?? post.excerpt })`. 404 state → "Post not found" + link to `/blog`.

`apps/web/src/pages/admin/AdminBlog.tsx` (default export): `useQuery(['admin-blog'], adminFetchBlog)` listing all posts (published + drafts) with a published badge; a create/edit form (title, slug optional, excerpt, body textarea, cover image upload via `uploadImage`, tags comma-separated, isPublished toggle, seo title/description) and delete. Mutations invalidate `['admin-blog']`; surface `ApiError` (e.g. duplicate-slug 409).

Wire: `apps/web/src/app/router.tsx` add lazy `/blog` and `/blog/:slug` under `StorefrontLayout`; `apps/web/src/app/StorefrontLayout.tsx` add a "Journal" nav link to `/blog`; `apps/web/src/pages/admin/AdminApp.tsx` add "Blog" nav + `<Route path="/blog" element={<AdminBlog />} />`.

- [ ] **Step 5: Run the web suite + typecheck + lint + build**

Run: `npm run test --workspace apps/web -- BlogPost`
Expected: PASS.
Run: `npm run test --workspace apps/web && npm run typecheck && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/admin/adminClient.ts apps/web/src/pages/Blog.tsx apps/web/src/pages/BlogPost.tsx apps/web/src/pages/admin/AdminBlog.tsx apps/web/src/app/router.tsx apps/web/src/app/StorefrontLayout.tsx apps/web/src/pages/admin/AdminApp.tsx
git commit -m "feat(web): blog index + post pages (SEO) + admin blog editor"
```

---

## Task 12: Seed demo content + verification + docs

**Files:**
- Modify: `apps/api/src/seed.ts` (demo reviews, banners, blog post, quiz questions)
- Modify: `docs/TASKS.md`, `docs/memory/current-state.md`, `docs/memory/next-session.md`, `docs/memory/decisions.md`, `.superpowers/sdd/progress.md`

**Interfaces:** none (content + bookkeeping).

- [ ] **Step 1: Extend the seed**

In `apps/api/src/seed.ts`, after the existing products/settings/admin seed, add: 1–2 demo Banners (one `home_hero`, active), one published BlogPost (`notes-on-oud`), 2–3 QuizQuestions with weights pointing at the seeded scent families, and 1–2 approved Reviews on a seeded product (then call `recomputeProductRating` for that product so its `rating` reflects them). Import the new models + `recomputeProductRating`. Keep it minimal and idempotent within the existing seed's clear-then-insert flow. You do NOT need to run it against Atlas — just make the code correct and typecheck-clean.

- [ ] **Step 2: Full workspace verification**

Run and confirm green:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
Expected: lint 0, typecheck 0, all suites pass (shared + api + web, including the new M3 suites), build clean.

- [ ] **Step 3: Update the ledgers**

- `docs/TASKS.md`: tick every Milestone 3 box.
- `docs/memory/current-state.md`: phase → "Milestone 3 complete"; list the new modules + test counts.
- `docs/memory/next-session.md`: point to Milestone 4 (Polish & ship) with the same plan→review→subagent workflow; carry the deferred a11y/test minors.
- `docs/memory/decisions.md`: append M3 decisions — quiz weights server-only; review one-per-user + rating recompute on moderation; banner scheduling window semantics; blog `publishedAt` set on first publish + SSR-lite Article SEO; rate-limiting still deferred to M4.
- `.superpowers/sdd/progress.md`: record Tasks 1–12 reviewed + any deferred minors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/seed.ts docs/TASKS.md docs/memory .superpowers/sdd/progress.md
git commit -m "chore(seed)+docs: Milestone 3 demo content; state, decisions, next-session updated"
```

- [ ] **Step 5: Finish the branch**

Use **superpowers:finishing-a-development-branch** to run the final whole-branch review (opus), apply Critical/Important fixes, then merge `feat/milestone-3-engagement` into `master` (no remote yet — do not push unless the user adds one and asks).

---

## Self-Review

**1. Spec coverage** (against `docs/05_API.md`, `docs/11_ADMIN.md`, `docs/12_SEO.md`, `docs/04_DATABASE.md`, M3 scope in `17_ROADMAP.md` + `next-session.md`):
- Reviews: public GET/POST + admin moderation + rating recompute → Task 3 (api) + Task 8 (web). ✅ (matches the `05_API.md` Reviews table exactly.)
- Quiz: public questions/result + admin config, weights server-only → Task 4 (api) + Task 9 (web). ✅
- Banners: public by placement + scheduling + admin CRUD → Task 5 (api) + Task 10 (web). ✅
- Blog: public list/detail + admin CRUD + SEO (Article JSON-LD, sitemap) → Tasks 6–7 (api) + Task 11 (web). ✅
- Shared schemas/DTOs for all four → Tasks 1–2. ✅
- Admin dashboard sections (Reviews/Banners/Blog/Quiz) wired into `/admin/*` → Tasks 8–11 each add their AdminApp nav+route. ✅ (A dashboard KPI page is described in `11_ADMIN.md` §1 but is NOT in the M3 roadmap scope — deferred; not a gap for this milestone.)
- SEO per `12_SEO.md`: Article JSON-LD + per-post head + sitemap + `/blog` static meta → Task 7; client-side `useSeo` parity on blog pages → Task 11. ✅ BreadcrumbList/Organization JSON-LD are listed in `12_SEO.md` but were not built in M1 either — deferred to the M4 SEO/polish pass (noted).
- Out of scope held out: animations/a11y-audit/perf/deploy (M4), payments/email (post-launch), rate-limiting (M4 security pass). ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N". API tasks carry complete model/route/test code. Web tasks give the testable logic as full code (client fns + the RED test + the load-bearing component contract) with concrete, non-placeholder prose for presentational pages (exact queries, props, routes, labels, brand tokens) — same depth that executed cleanly in Milestone 2. The markdown-rendering shortcut in Task 11 (split-on-blank-line `<p>`, no md lib) is an explicit YAGNI decision, not a placeholder.

**3. Type consistency:** `ReviewDTO` (Task 1) ↔ `toReviewDTO` (Task 3) ↔ web client/section (Task 8). `BannerDTO`/`BANNER_PLACEMENT` (Task 1) ↔ model/`toBannerDTO` (Task 5) ↔ `BannerStrip` (Task 10). `BlogPostDTO`/`BlogPostListItemDTO`/`BlogListDTO` (Task 2) ↔ `toBlogPostDTO`/`toBlogListItemDTO` (Task 6) ↔ SEO (Task 7) ↔ web (Task 11). `QuizQuestionPublicDTO` (no weights) vs `QuizQuestionAdminDTO` (weights) + `QuizResultDTO` (Task 2) ↔ public/admin serializers (Task 4) ↔ quiz flow/config (Task 9). `quizResultSchema.selections[].answerIndex` is the same field the web sends and the api indexes. `recomputeProductRating(productId: string)` is called from both PUT and DELETE admin review routes. `buildSitemap(origin, products, blogSlugs?)` signature change (Task 7) is matched at its only call site in `app.ts`. No signature drift found.

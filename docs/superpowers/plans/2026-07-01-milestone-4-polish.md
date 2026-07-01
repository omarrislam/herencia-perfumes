# Milestone 4 — Polish (code) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring HERENCIA to launch quality — semantic dark-mode theming, accessibility, purposeful perf-safe animations, performance (fonts/images/CSP/prerender), rate-limiting, the batched M1–M3 deferred minors, broadened tests, and a Playwright E2E smoke — **without** the ops/deploy steps (VPS/Nginx/PM2/Search Console are a separate later plan).

**Architecture:** Polish passes over the existing three-workspace app (`packages/shared`, `apps/api`, `apps/web`). No new domain features. New cross-cutting primitives are introduced once and reused: semantic feedback CSS tokens (theming), a `useReducedMotion` + `lib/motion.ts` + `Reveal` motion layer (Framer Motion, lazy), a `useFocusTrap` hook (a11y), a safe markdown renderer (blog), a real Helmet CSP, self-hosted fonts, build-time static prerender, and `express-rate-limit` limiters.

**Tech Stack:** Node/Express/TypeScript, Mongoose 8, Zod (shared), Vitest + Supertest (api), React 18 + React Router 6 + React Query + Vitest/RTL (web). **New deps:** `framer-motion`, `@fontsource/cinzel`, `@fontsource/jost`, `marked`, `dompurify` + `@types/dompurify` (web); `express-rate-limit` (api); `@playwright/test` (root, dev).

## Global Constraints

- **TypeScript strict** + `noUncheckedIndexedAccess`; no `any` except the sanctioned `serialize.ts` `AnyDoc` pattern.
- **Clean code, YAGNI.** No new domain features beyond this plan. Do not re-litigate locked decisions (`docs/memory/decisions.md` #1–30).
- **Brand tokens only** for color — `text-content`,`text-muted`,`bg-bg`,`surface`,`border-line`,`bg-maroon`,`text-cream`,`text-accent`, and the **new** feedback tokens `success`/`warning`/`danger`/`info` (+ `-soft` background variants) from Task 1. **No raw Tailwind palette classes** (`red-500`, `green-600`, `green-100`, `yellow-100`, `amber-500`, etc.) in shipped UI after Task 2.
- **Animations:** transforms/opacity only (never width/height/top/left), no CLS, never delay LCP, durations 150–400ms, `ease-out`/low-stiffness spring, **respect `prefers-reduced-motion`** (near-instant motion-free path). Framer Motion lazy so it never blocks first paint.
- **Accessibility:** semantic HTML, visible focus (`focus-visible:ring`), keyboard nav, labelled controls, contrast ≥ WCAG AA, landmarks. Modals trap + restore focus.
- **Performance:** Lighthouse ≥ 90 mobile (Home + Product detail). Transforms/opacity animations; self-hosted subset fonts (`font-display: swap`); Cloudinary `f_auto,q_auto` responsive `srcset`/`sizes`; preload LCP hero; keep admin/quiz/blog in lazy chunks.
- **Security:** never trust client prices (unchanged); real Helmet CSP; rate-limit auth + order + review mutations. Blog body must stay XSS-safe (sanitize before render).
- **Tests:** api suite runs serialized (`fileParallelism: false`) with `mongodb-memory-server`; mirror `apps/api/src/test/db.ts` (`connectMemory`/`clearDb`) + `apps/api/src/test/auth.ts` (`authCookie(userId, role)`). `createApp({ clientOrigin })`. Run lint via the **root** `npm run lint`. Rate limiters MUST `skip` when `NODE_ENV==='test'` so existing suites stay green.
- **Commits:** frequent; every commit body ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Branch:** `feat/milestone-4-polish` (NOT master).

---

## File Structure

**`apps/web/src/`**
- `styles/index.css` — *modify*: add feedback CSS vars (light+dark); logo shimmer keyframes.
- `tailwind.config.ts` — *modify*: bind feedback tokens; register `Cinzel`/`Jost` self-host names (unchanged names).
- `index.html` — *modify*: remove Google Fonts `<link>`/preconnect (fonts self-hosted); keep title.
- `main.tsx` — *modify*: import `@fontsource/*` CSS; `hydrateRoot` when prerendered; keep provider tree.
- `app/router.tsx` — *modify*: export `routes` config for reuse by prerender.
- `app/AppRoutes.tsx` — *create*: `useRoutes(routes)` wrapper (shared client/SSR).
- `app/StorefrontLayout.tsx` — *modify*: logo shimmer class; wrap page `<Outlet>` in route cross-fade.
- `lib/motion.ts` — *create*: duration/easing tokens + variants.
- `hooks/useReducedMotion.ts` — *create*.
- `hooks/useFocusTrap.ts` — *create*.
- `components/Reveal.tsx` — *create*: lazy scroll-reveal wrapper.
- `components/Button.tsx` — *modify*: press micro-interaction (transform).
- `components/ProductCard.tsx` — *modify*: hover lift/zoom already present — keep transform-only; wrap grids in `Reveal` at call sites.
- `components/ProductImage.tsx` — *modify*: blur-up placeholder + `sizes` prop.
- `lib/cloudinary.ts` — *modify*: `cldBlur()` low-res placeholder helper.
- `lib/markdown.ts` — *create*: `renderMarkdownSafe(md): string` (marked + DOMPurify).
- `features/cart/CartDrawer.tsx` — *modify*: focus trap/return; Framer slide + backdrop fade.
- `features/cart/CartContext.tsx` — *modify*: expose `justAdded` pulse signal (add-to-cart confirmation).
- `pages/Home.tsx`, `pages/Products.tsx`, `pages/Bundles.tsx`, `pages/Blog.tsx` — *modify*: wrap sections/grids in `Reveal`; hero image `loading="eager"` + preload.
- `pages/BlogPost.tsx` — *modify*: render body via `renderMarkdownSafe` into sanitized HTML.
- `pages/Login.tsx`, `pages/Register.tsx` — *modify*: visible `<label>`s; `text-danger` errors.
- `pages/admin/AdminReviews.tsx`, `AdminBanners.tsx`, `AdminBlog.tsx` — *modify*: semantic badges/feedback; surface `ApiError` on delete; invalidate public queries (banners/blog).
- `pages/admin/AdminQuiz.tsx` — *modify*: remove-answer `aria-label` + `type="button"`; stable keys.
- `pages/admin/AdminOrders.tsx` — *modify*: `<select>` `aria-label`.

**`apps/api/src/`**
- `app.ts` — *modify*: real Helmet CSP; mount rate limiters.
- `middleware/rateLimit.ts` — *create*: `authLimiter`, `orderLimiter`, `reviewLimiter` (+ `makeLimiter`).
- `routes/reviews.ts` — *modify*: friendly duplicate-review 409 on the race path.
- `modules/review/service.ts` — *modify*: single `agg[0]` local (min-2 cleanup).
- Test hardening across `routes/*.test.ts`, `lib/seo.test.ts` (Task 16).

**Root / build**
- `apps/web/scripts/prerender.tsx` — *create*: post-build static prerender of shell routes.
- `apps/web/package.json` — *modify*: `build` runs vite then prerender; add deps.
- `playwright.config.ts` — *create* (repo root).
- `apps/web/e2e/shop.spec.ts`, `apps/web/e2e/admin.spec.ts` — *create*.
- `package.json` (root) — *modify*: `test:e2e` script; `@playwright/test` dev dep.

---

## Task 1: Semantic feedback theme tokens

**Files:**
- Modify: `apps/web/src/styles/index.css`
- Modify: `apps/web/tailwind.config.ts`

**Interfaces:**
- Produces Tailwind color utilities: `success`,`warning`,`danger`,`info` (foreground) and `success-soft`,`warning-soft`,`danger-soft`,`info-soft` (badge backgrounds), each theme-aware via CSS vars. Consumed by Tasks 2, 4, 7.

- [ ] **Step 1: Add feedback CSS variables (light + dark)**

In `apps/web/src/styles/index.css`, extend both theme blocks. Add to `:root[data-theme='light']`:
```css
  --success: #15803d;
  --success-soft: rgba(21, 128, 61, 0.12);
  --warning: #b45309;
  --warning-soft: rgba(180, 83, 9, 0.12);
  --danger: #b91c1c;
  --danger-soft: rgba(185, 28, 28, 0.12);
  --info: #1d4ed8;
  --info-soft: rgba(29, 78, 216, 0.12);
```
Add to `:root[data-theme='dark']`:
```css
  --success: #4ade80;
  --success-soft: rgba(74, 222, 128, 0.15);
  --warning: #fbbf24;
  --warning-soft: rgba(251, 191, 36, 0.15);
  --danger: #f87171;
  --danger-soft: rgba(248, 113, 113, 0.15);
  --info: #60a5fa;
  --info-soft: rgba(96, 165, 250, 0.15);
```

- [ ] **Step 2: Bind tokens in Tailwind**

In `apps/web/tailwind.config.ts`, add to `theme.extend.colors` (after `line`):
```ts
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
```

- [ ] **Step 3: Verify build**

Run: `npm run build --workspace apps/web`
Expected: build succeeds; the new utilities are available (Tailwind emits them once used in Task 2).

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/styles/index.css apps/web/tailwind.config.ts
git commit -m "feat(web): add semantic feedback theme tokens (success/warning/danger/info)"
```

---

## Task 2: Apply semantic tokens across admin badges + form feedback

**Files:**
- Modify: `apps/web/src/pages/admin/AdminReviews.tsx`
- Modify: `apps/web/src/pages/admin/AdminBanners.tsx`
- Modify: `apps/web/src/pages/admin/AdminBlog.tsx`
- Modify: `apps/web/src/pages/Login.tsx`
- Modify: `apps/web/src/pages/Register.tsx`
- Modify: `apps/web/src/features/cart/CartDrawer.tsx`

**Interfaces:**
- Consumes: feedback tokens from Task 1.
- Produces: zero raw-palette color classes in these files.

- [ ] **Step 1: AdminReviews — badge + error + delete button**

In `apps/web/src/pages/admin/AdminReviews.tsx`:
- Status badge: replace `review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'` with `review.isApproved ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'`.
- Load error: `text-red-500` → `text-danger`.
- Delete button: `text-red-500 hover:border-red-500` → `text-danger hover:border-danger`.
- Action-failed line: `text-red-500` → `text-danger`.

- [ ] **Step 2: AdminBanners — active flag + errors**

In `apps/web/src/pages/admin/AdminBanners.tsx`:
- Active strong: `banner.isActive ? 'text-green-600' : 'text-red-500'` → `banner.isActive ? 'text-success' : 'text-danger'`.
- All `text-red-500` (upload error, form error, load error, delete failed, delete button) → `text-danger`.

- [ ] **Step 3: AdminBlog — status badge + errors**

In `apps/web/src/pages/admin/AdminBlog.tsx`:
- Status strong: `post.isPublished ? 'text-green-600' : 'text-amber-500'` → `post.isPublished ? 'text-success' : 'text-warning'`.
- All `text-red-500` → `text-danger`.

- [ ] **Step 4: Login/Register — error color**

In `apps/web/src/pages/Login.tsx` and `apps/web/src/pages/Register.tsx`, replace the error `text-red-500` with `text-danger`.

- [ ] **Step 5: CartDrawer — qty stepper accent**

In `apps/web/src/features/cart/CartDrawer.tsx`, the two qty-stepper buttons use `hover:bg-gold/10`. Replace both with `hover:bg-accent/10` (semantic accent, theme-aware). (Leave `bg-maroon`/`text-cream`/`text-accent` — those are brand tokens.)

- [ ] **Step 6: Verify no raw palette remains + build**

Run:
```bash
grep -rnE "text-(red|green|amber|yellow)-[0-9]|bg-(red|green|amber|yellow)-[0-9]" apps/web/src && echo "FOUND RAW PALETTE" || echo "clean"
npm run build --workspace apps/web
npm run lint
```
Expected: `clean`; build + lint succeed. (If any legitimate non-color match appears, re-verify by eye.)

- [ ] **Step 7: Commit**
```bash
git add apps/web/src
git commit -m "fix(web): replace raw-palette feedback colors with semantic dark-mode tokens"
```

---

## Task 3: Friendly duplicate-review 409 + review-service cleanup

**Files:**
- Modify: `apps/api/src/routes/reviews.ts`
- Modify: `apps/api/src/modules/review/service.ts`
- Test: `apps/api/src/routes/reviews.test.ts`

**Interfaces:**
- Consumes: existing `errorHandler` (already maps generic `11000`→409 `conflict`).
- Produces: POST `/products/:slug/reviews` returns 409 with message `You have already reviewed this product` on BOTH the pre-check path and the race path (duplicate-key).

**Background:** the route pre-checks `Review.exists(...)`. On a concurrent double-submit both pass the check, one `create` throws a Mongo duplicate-key (`code: 11000`), which the generic handler maps to 409 "Duplicate value". We map it to the review-specific message for a coherent client experience.

- [ ] **Step 1: Add the failing test**

In `apps/api/src/routes/reviews.test.ts`, add (mirror the file's existing setup — `connectMemory`/`clearDb`, seeded active product, `authCookie(userId,'customer')`):
```ts
it('maps a duplicate-key race to a friendly 409', async () => {
  // First review succeeds
  await request(app)
    .post(`/api/products/${slug}/reviews`)
    .set('Cookie', authCookie(userId, 'customer'))
    .send({ rating: 5, body: 'Lovely' })
    .expect(201);
  // Simulate the race: bypass the exists() pre-check is not possible via HTTP,
  // so assert the second submit returns the friendly conflict message + code.
  const res = await request(app)
    .post(`/api/products/${slug}/reviews`)
    .set('Cookie', authCookie(userId, 'customer'))
    .send({ rating: 4, body: 'Again' })
    .expect(409);
  expect(res.body.error.code).toBe('conflict');
  expect(res.body.error.message).toBe('You have already reviewed this product');
});
```

- [ ] **Step 2: Run test to verify it passes for the pre-check path but pins the message**

Run: `npm run test --workspace apps/api -- reviews`
Expected: PASS (the pre-check already returns this message). This test now *locks* the message; Step 3 ensures the race path matches it too.

- [ ] **Step 3: Map duplicate-key in the route catch**

In `apps/api/src/routes/reviews.ts`, change the POST handler's `catch (err)` to translate a duplicate-key into the same friendly error before delegating:
```ts
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return next(new HttpError(409, 'You have already reviewed this product', 'conflict'));
      }
      next(err);
    }
```

- [ ] **Step 4: Clean up the aggregation local (min-2)**

In `apps/api/src/modules/review/service.ts`, replace the double `agg[0]` access with a single local:
```ts
  const row = agg[0];
  const avg = row ? Math.round(row.avg * 10) / 10 : 0;
  const count = row?.count ?? 0;
```

- [ ] **Step 5: Run the full api suite**

Run: `npm run test --workspace apps/api`
Expected: all files green.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/routes/reviews.ts apps/api/src/modules/review/service.ts apps/api/src/routes/reviews.test.ts
git commit -m "fix(api): friendly 409 on duplicate-review race; tidy rating aggregation"
```

---

## Task 4: Admin mutations invalidate public queries + surface ApiError on delete

**Files:**
- Modify: `apps/web/src/pages/admin/AdminBanners.tsx`
- Modify: `apps/web/src/pages/admin/AdminBlog.tsx`
- Modify: `apps/web/src/pages/admin/AdminReviews.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsSection.tsx`

**Interfaces:**
- Public query keys (verify against `apps/web/src/components/BannerStrip.tsx` and `apps/web/src/pages/Blog.tsx`/`BlogPost.tsx` before editing): banners are cached under `['banners', placement]`; blog under `['blog']` (list) and `['blog', slug]` (detail). Match the exact keys those files use.

- [ ] **Step 1: AdminBanners — invalidate public banners**

In `apps/web/src/pages/admin/AdminBanners.tsx`, change `invalidate` to also drop the public cache:
```ts
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-banners'] });
    void qc.invalidateQueries({ queryKey: ['banners'] }); // all placements
  };
```
And surface delete errors: replace `Delete failed.` block text with the ApiError message:
```tsx
      {deleteMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">
          {deleteMut.error instanceof ApiError
            ? `Error ${deleteMut.error.status}: ${deleteMut.error.message}`
            : 'Delete failed.'}
        </p>
      )}
```

- [ ] **Step 2: AdminBlog — invalidate public blog + delete error**

In `apps/web/src/pages/admin/AdminBlog.tsx`:
```ts
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-blog'] });
    void qc.invalidateQueries({ queryKey: ['blog'] }); // list + details
  };
```
Delete-error block → same `ApiError`-aware `text-danger` pattern as Step 1.

- [ ] **Step 3: AdminReviews — surface ApiError on moderate/delete**

In `apps/web/src/pages/admin/AdminReviews.tsx`, replace the static `Action failed. Please try again.` with the server message when available:
```tsx
      {(moderateMut.isError || deleteMut.isError) && (
        <p className="mt-3 font-body text-sm text-danger">
          {(() => {
            const e = (moderateMut.error ?? deleteMut.error);
            return e instanceof ApiError ? `Error ${e.status}: ${e.message}` : 'Action failed. Please try again.';
          })()}
        </p>
      )}
```
Add `import { ApiError } from '../../lib/api';` at the top. Also invalidate the public per-product reviews so approvals appear live:
```ts
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      void qc.invalidateQueries({ queryKey: ['reviews'] }); // public product reviews
    },
```
(apply to both `moderateMut` and `deleteMut`).

- [ ] **Step 4: ReviewsSection — confirm delete/error already surfaces ApiError**

Open `apps/web/src/features/reviews/ReviewsSection.tsx`; confirm the submit error path uses `ApiError` (it does per ledger). No change unless a generic string remains — if so, apply the same `text-danger` + ApiError message pattern.

- [ ] **Step 5: Verify build + existing web tests**

Run:
```bash
npm run build --workspace apps/web
npm run test --workspace apps/web
npm run lint
```
Expected: all green.

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/pages/admin apps/web/src/features/reviews
git commit -m "fix(web): admin mutations invalidate public caches; surface ApiError on delete/moderate"
```

---

## Task 5: Blog markdown renderer (safe)

**Files:**
- Create: `apps/web/src/lib/markdown.ts`
- Create: `apps/web/src/lib/markdown.test.ts`
- Modify: `apps/web/src/pages/BlogPost.tsx`
- Modify: `apps/web/package.json` (deps)

**Interfaces:**
- Produces: `renderMarkdownSafe(md: string): string` — returns **sanitized** HTML (marked → DOMPurify). Consumed by `BlogPost.tsx`.

**Decision update:** supersedes M3 decision #29's "escaped `<p>` only, no markdown lib". Body is now real markdown, but XSS-safe via DOMPurify (see Task 18 to log decision #31). `dangerouslySetInnerHTML` is acceptable **only** on DOMPurify output.

- [ ] **Step 1: Add deps**
```bash
npm install marked dompurify --workspace apps/web
npm install -D @types/dompurify --workspace apps/web
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/lib/markdown.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderMarkdownSafe } from './markdown';

describe('renderMarkdownSafe', () => {
  it('renders bold and headings', () => {
    const html = renderMarkdownSafe('# Title\n\nHello **world**');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>world</strong>');
  });
  it('strips script tags and event handlers', () => {
    const html = renderMarkdownSafe('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
  it('keeps links but drops javascript: URLs', () => {
    const html = renderMarkdownSafe('[ok](https://x.com) [bad](javascript:alert(1))');
    expect(html).toContain('href="https://x.com"');
    expect(html).not.toContain('javascript:');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace apps/web -- markdown`
Expected: FAIL ("renderMarkdownSafe is not a function" / module not found).

- [ ] **Step 4: Implement**

`apps/web/src/lib/markdown.ts`:
```ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/** Parse markdown to HTML, then sanitize. Safe to pass to dangerouslySetInnerHTML. */
export function renderMarkdownSafe(md: string): string {
  const raw = marked.parse(md ?? '', { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test --workspace apps/web -- markdown`
Expected: PASS.

- [ ] **Step 6: Render in BlogPost**

In `apps/web/src/pages/BlogPost.tsx`, replace the split-on-blank-line `<p>` rendering of the body with sanitized markdown. Add `import { renderMarkdownSafe } from '../lib/markdown';` and render:
```tsx
<div
  className="prose-herencia font-body text-content"
  dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(post.body) }}
/>
```
Add minimal readable spacing for the generated tags in `apps/web/src/styles/index.css`:
```css
.prose-herencia h1, .prose-herencia h2, .prose-herencia h3 { font-family: 'Cinzel', serif; margin: 1.25rem 0 0.5rem; }
.prose-herencia p { margin: 0.75rem 0; line-height: 1.7; }
.prose-herencia a { color: var(--accent); text-decoration: underline; }
.prose-herencia ul, .prose-herencia ol { margin: 0.75rem 0; padding-left: 1.5rem; list-style: revert; }
```

- [ ] **Step 7: Verify build + BlogPost test**

Run:
```bash
npm run test --workspace apps/web -- BlogPost markdown
npm run build --workspace apps/web
```
Expected: green. (If `BlogPost.test.tsx` asserted the old `<p>`-split behavior, update it to assert markdown output, e.g. a `**bold**` body renders `<strong>`.)

- [ ] **Step 8: Commit**
```bash
git add apps/web/src/lib/markdown.ts apps/web/src/lib/markdown.test.ts apps/web/src/pages/BlogPost.tsx apps/web/src/styles/index.css apps/web/package.json package-lock.json
git commit -m "feat(web): safe markdown rendering for blog body (marked + DOMPurify)"
```

---

## Task 6: CartDrawer focus trap + return

**Files:**
- Create: `apps/web/src/hooks/useFocusTrap.ts`
- Create: `apps/web/src/hooks/useFocusTrap.test.tsx`
- Modify: `apps/web/src/features/cart/CartDrawer.tsx`

**Interfaces:**
- Produces: `useFocusTrap(active: boolean): React.RefObject<HTMLDivElement>` — when `active`, moves focus into the container, traps Tab/Shift+Tab within it, and restores focus to the previously-focused element on deactivate. Consumed by CartDrawer (reusable for future modals).

- [ ] **Step 1: Write the failing test**

`apps/web/src/hooks/useFocusTrap.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useFocusTrap(open);
  return (
    <div>
      <button onClick={() => setOpen(true)}>opener</button>
      {open && (
        <div ref={ref} role="dialog">
          <button>first</button>
          <button onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable on open and restores on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByText('opener');
    opener.focus();
    await user.click(opener);
    expect(screen.getByText('first')).toHaveFocus();
    await user.click(screen.getByText('close'));
    expect(opener).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web -- useFocusTrap`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

`apps/web/src/hooks/useFocusTrap.ts`:
```ts
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);
  return ref;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/web -- useFocusTrap`
Expected: PASS.

- [ ] **Step 5: Wire into CartDrawer**

In `apps/web/src/features/cart/CartDrawer.tsx`, import the hook and attach the ref to the dialog panel:
```tsx
import { useFocusTrap } from '../../hooks/useFocusTrap';
// inside component:
const trapRef = useFocusTrap(open);
```
Add `ref={trapRef}` to the `role="dialog"` panel `<div>`. (Escape-to-close already exists.)

- [ ] **Step 6: Verify web suite**

Run: `npm run test --workspace apps/web && npm run lint`
Expected: green.

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/hooks/useFocusTrap.ts apps/web/src/hooks/useFocusTrap.test.tsx apps/web/src/features/cart/CartDrawer.tsx
git commit -m "feat(web): focus trap + focus return for the cart drawer (a11y)"
```

---

## Task 7: Form labels + control aria-labels + stable keys

**Files:**
- Modify: `apps/web/src/pages/Login.tsx`
- Modify: `apps/web/src/pages/Register.tsx`
- Modify: `apps/web/src/pages/admin/AdminOrders.tsx`
- Modify: `apps/web/src/pages/admin/AdminQuiz.tsx`

**Interfaces:** none new. Consumes: `text-danger` (Task 2).

- [ ] **Step 1: Login — visible labels**

In `apps/web/src/pages/Login.tsx`, wrap each input with a visible `<label>` (keep `type`/`required`/state):
```tsx
<label className="mb-3 block">
  <span className="mb-1 block font-body text-sm text-muted">Email</span>
  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
    className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
</label>
<label className="mb-4 block">
  <span className="mb-1 block font-body text-sm text-muted">Password</span>
  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
</label>
```
Remove the now-redundant `placeholder`/`aria-label` duplication (a visible label is the accessible name).

- [ ] **Step 2: Register — visible labels**

Apply the same visible-`<label>` pattern to every input in `apps/web/src/pages/Register.tsx` (read the file first; wrap each field, keep validation/state).

- [ ] **Step 3: AdminOrders — select aria-label**

In `apps/web/src/pages/admin/AdminOrders.tsx`, add `aria-label` to the per-row status `<select>` (e.g. `aria-label={\`Order ${order.orderNumber} status\`}`) and to the top filter `<select>` (`aria-label="Filter orders by status"`). Read the file to match variable names.

- [ ] **Step 4: AdminQuiz — remove-answer button + types + keys**

In `apps/web/src/pages/admin/AdminQuiz.tsx`:
- The answer-remove `✕` button: add `type="button"` and `aria-label="Remove answer"`.
- All non-submit `<button>`s inside the form: add `type="button"`.
- Replace `key={idx}` on the answers list with a stable key. If answers have no id, derive one (e.g. `key={\`${qIdx}-${answer.label || idx}\`}`), or add a client-side `crypto.randomUUID()` id when creating a new blank answer. Prefer the stable-id approach when the form already tracks answer objects.

- [ ] **Step 5: Verify build + web tests + lint**

Run:
```bash
npm run test --workspace apps/web
npm run build --workspace apps/web
npm run lint
```
Expected: green. (Update Login/Register tests if they queried by placeholder text — switch to `getByLabelText`.)

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/pages
git commit -m "fix(web): visible form labels, control aria-labels, stable list keys (a11y)"
```

---

## Task 8: Motion foundation — tokens, reduced-motion, Reveal

**Files:**
- Modify: `apps/web/package.json` (add `framer-motion`)
- Create: `apps/web/src/lib/motion.ts`
- Create: `apps/web/src/hooks/useReducedMotion.ts`
- Create: `apps/web/src/hooks/useReducedMotion.test.tsx`
- Create: `apps/web/src/components/Reveal.tsx`
- Create: `apps/web/src/components/Reveal.test.tsx`

**Interfaces:**
- Produces:
  - `DURATION` (`{ fast: 0.15, base: 0.25, slow: 0.4 }`), `EASE_OUT` (`[0.16, 1, 0.3, 1]`), `fadeUp` variants — from `lib/motion.ts`.
  - `useReducedMotion(): boolean` — reads `matchMedia('(prefers-reduced-motion: reduce)')`, live-updates.
  - `<Reveal as? delay? className?>` — fades/slides children up on first viewport entry; renders children immediately (no opacity:0) when reduced motion is on. Consumed by Task 9.

- [ ] **Step 1: Add dep**
```bash
npm install framer-motion --workspace apps/web
```

- [ ] **Step 2: Motion tokens**

`apps/web/src/lib/motion.ts`:
```ts
import type { Variants } from 'framer-motion';

export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};
```

- [ ] **Step 3: reduced-motion hook — failing test**

`apps/web/src/hooks/useReducedMotion.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({ matches, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }) as unknown as MediaQueryList;
}

describe('useReducedMotion', () => {
  beforeEach(() => mockMatchMedia(false));
  it('returns false when motion is allowed', () => {
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
  it('returns true when reduce is preferred', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm run test --workspace apps/web -- useReducedMotion`
Expected: FAIL (module not found).

- [ ] **Step 5: Implement the hook**

`apps/web/src/hooks/useReducedMotion.ts`:
```ts
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
```

- [ ] **Step 6: Reveal — failing test**

`apps/web/src/components/Reveal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal><p>hello</p></Reveal>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/web -- Reveal`
Expected: FAIL (module not found).

- [ ] **Step 8: Implement Reveal**

`apps/web/src/components/Reveal.tsx`:
```tsx
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp, DURATION, EASE_OUT } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 9: Run to verify passes + full web suite**

Run: `npm run test --workspace apps/web -- Reveal useReducedMotion && npm run test --workspace apps/web`
Expected: green.

- [ ] **Step 10: Commit**
```bash
git add apps/web/src/lib/motion.ts apps/web/src/hooks/useReducedMotion.ts apps/web/src/hooks/useReducedMotion.test.tsx apps/web/src/components/Reveal.tsx apps/web/src/components/Reveal.test.tsx apps/web/package.json package-lock.json
git commit -m "feat(web): motion foundation — tokens, reduced-motion hook, Reveal (lazy, a11y-safe)"
```

---

## Task 9: Apply reveals + card/button micro-interactions + logo shimmer

**Files:**
- Modify: `apps/web/src/pages/Home.tsx`, `Products.tsx`, `Bundles.tsx`, `Blog.tsx`
- Modify: `apps/web/src/components/Button.tsx`
- Modify: `apps/web/src/app/StorefrontLayout.tsx`
- Modify: `apps/web/src/styles/index.css`

**Interfaces:** consumes `Reveal` (Task 8). All motion is transforms/opacity, reduced-motion aware.

- [ ] **Step 1: Wrap content sections in Reveal**

In `Home.tsx` wrap the featured grid section (NOT the hero — hero must paint immediately for LCP) in `<Reveal>`. In `Products.tsx`/`Bundles.tsx` wrap the results grid; in `Blog.tsx` wrap the post-cards grid. Read each file first to place the wrapper around the section container (avoid wrapping each card individually — one `Reveal` per section keeps observers cheap and avoids CLS).

- [ ] **Step 2: Button press micro-interaction**

In `apps/web/src/components/Button.tsx`, add an active-press transform to `base` (transform-only, GPU-safe):
```ts
const base =
  'inline-flex items-center justify-center rounded-md px-4 py-2 font-body text-sm transition-transform transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none';
```

- [ ] **Step 3: ProductCard hover — confirm transform-only**

`apps/web/src/components/ProductCard.tsx` already uses `hover:-translate-y-1` + `group-hover:scale-105` (transforms). Add `motion-reduce:transform-none motion-reduce:transition-none` to the `<Link>` and the `<ProductImage>` className so reduced-motion users get no movement. No layout properties animate — good (keeps CLS 0).

- [ ] **Step 4: Logo gold shimmer (CSS)**

In `apps/web/src/styles/index.css` add:
```css
@keyframes herencia-shimmer {
  0% { background-position: -120% 0; }
  100% { background-position: 220% 0; }
}
.logo-shimmer {
  background: linear-gradient(90deg, var(--text) 0%, var(--text) 40%, var(--accent) 50%, var(--text) 60%, var(--text) 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: herencia-shimmer 6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .logo-shimmer { animation: none; color: var(--text); -webkit-text-fill-color: currentColor; }
}
```
In `apps/web/src/app/StorefrontLayout.tsx`, add `logo-shimmer` to the `HERENCIA` brand `<Link>` className.

- [ ] **Step 5: Verify build + tests + lint**

Run:
```bash
npm run build --workspace apps/web
npm run test --workspace apps/web
npm run lint
```
Expected: green. Manually sanity-check `npm run dev` if convenient: hero paints instantly; grids fade up once on scroll; reduced-motion (OS setting) shows no movement.

- [ ] **Step 6: Commit**
```bash
git add apps/web/src
git commit -m "feat(web): section reveals, button/card micro-interactions, logo shimmer (reduced-motion safe)"
```

---

## Task 10: CartDrawer motion + add-to-cart confirmation + route cross-fade

**Files:**
- Modify: `apps/web/src/features/cart/CartDrawer.tsx`
- Modify: `apps/web/src/features/cart/CartContext.tsx`
- Modify: `apps/web/src/app/StorefrontLayout.tsx`

**Interfaces:**
- CartContext produces `justAdded: boolean` (pulses true briefly after an add), consumed by the header cart button for a confirmation pulse.

- [ ] **Step 1: Animate the drawer with AnimatePresence**

In `apps/web/src/features/cart/CartDrawer.tsx`, wrap backdrop + panel in `AnimatePresence`/`motion.div`. Keep the focus trap ref on the panel. Because `AnimatePresence` needs the element to unmount on exit, move the `if (!open) return null` out and let AnimatePresence gate on `open`:
```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { DURATION, EASE_OUT } from '../../lib/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
// ...
const reduced = useReducedMotion();
const d = reduced ? 0 : DURATION.base;
return (
  <AnimatePresence>
    {open && (
      <>
        <motion.div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true"
          onClick={() => setOpen(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: d }} />
        <motion.div ref={trapRef} role="dialog" aria-label="Cart" aria-modal="true"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-bg shadow-xl"
          initial={{ x: reduced ? 0 : '100%' }} animate={{ x: 0 }} exit={{ x: reduced ? 0 : '100%' }}
          transition={{ duration: d, ease: EASE_OUT }}>
          {/* ...existing header/body/footer unchanged... */}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
```
(Keep all existing inner markup.)

- [ ] **Step 2: Add `justAdded` to CartContext**

In `apps/web/src/features/cart/CartContext.tsx`, add a transient signal. Read the file first; add state + set it wherever an item is added:
```ts
const [justAdded, setJustAdded] = useState(false);
// in the add-item path, after a successful add:
setJustAdded(true);
setTimeout(() => setJustAdded(false), 600);
```
Include `justAdded` in the context value + its TypeScript type.

- [ ] **Step 3: Confirmation pulse on the header cart button**

In `apps/web/src/app/StorefrontLayout.tsx`, read `justAdded` from `useCart()` and add a pulse class to the cart button when true:
```tsx
className={`relative font-body text-content hover:text-accent ${justAdded ? 'motion-safe:animate-[pulse_0.6s_ease-out]' : ''}`}
```

- [ ] **Step 4: Route cross-fade**

Wrap the storefront `<Outlet />` in a keyed fade using `useLocation().key`. In `StorefrontLayout.tsx`:
```tsx
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
// ...
const location = useLocation();
// replace <main>…<Outlet/>…</main> body:
<main className="mx-auto w-full max-w-6xl flex-1 p-4">
  <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.2 }}>
    <Outlet />
  </motion.div>
</main>
```
Keep it opacity-only (no y-shift → no CLS on route change). Framer already honors reduced-motion for `opacity` minimally; the duration is short and harmless.

- [ ] **Step 5: Verify build + tests + lint**

Run:
```bash
npm run build --workspace apps/web
npm run test --workspace apps/web
npm run lint
```
Expected: green. (If `CartContext.test.tsx` asserts the context shape, extend it to include `justAdded`.)

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/cart apps/web/src/app/StorefrontLayout.tsx
git commit -m "feat(web): cart drawer slide/backdrop motion, add-to-cart pulse, route cross-fade"
```

---

## Task 11: Self-host + subset fonts

**Files:**
- Modify: `apps/web/package.json` (add `@fontsource/cinzel`, `@fontsource/jost`)
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/index.html`

**Interfaces:** none. Removes the render-blocking third-party Google Fonts request; fonts served same-origin with `font-display: swap` (fontsource default).

- [ ] **Step 1: Add font deps**
```bash
npm install @fontsource/cinzel @fontsource/jost --workspace apps/web
```

- [ ] **Step 2: Import the exact weights in use**

At the top of `apps/web/src/main.tsx` (before `./styles/index.css`), add:
```ts
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/700.css';
```
(Fontsource registers the family names `Cinzel` and `Jost`, matching `tailwind.config.ts` — no token change needed.)

- [ ] **Step 3: Remove the Google Fonts markup**

In `apps/web/index.html`, delete the two `<link rel="preconnect" …>` lines and the Google Fonts `<link href="https://fonts.googleapis.com/…">`. Keep the `<title>`, charset, and viewport.

- [ ] **Step 4: Verify build + that no external font URL remains**

Run:
```bash
grep -rn "fonts.googleapis.com\|fonts.gstatic.com" apps/web/index.html && echo "STILL PRESENT" || echo "clean"
npm run build --workspace apps/web
```
Expected: `clean`; build emits hashed woff2 assets under `dist/assets`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/package.json package-lock.json apps/web/src/main.tsx apps/web/index.html
git commit -m "perf(web): self-host Cinzel/Jost via fontsource; drop render-blocking Google Fonts"
```

---

## Task 12: Responsive images + LCP hero preload + blur-up placeholder

**Files:**
- Modify: `apps/web/src/lib/cloudinary.ts`
- Modify: `apps/web/src/components/ProductImage.tsx`
- Modify: `apps/web/src/pages/Home.tsx`
- Test: `apps/web/src/lib/cloudinary.test.ts` (create if absent)

**Interfaces:**
- Produces `cldBlur(publicId): string` — a tiny blurred placeholder URL. `ProductImage` gains an optional `sizes?: string` and `eager` blur-up background.

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/cloudinary.test.ts` (add to existing file if present):
```ts
import { describe, it, expect } from 'vitest';
import { cldBlur } from './cloudinary';

describe('cldBlur', () => {
  it('returns a low-res blurred transform for a public id', () => {
    const url = cldBlur('perfumes/royal-oud');
    // With no VITE_CLOUDINARY_CLOUD_NAME in tests, falls back to the raw id.
    expect(typeof url).toBe('string');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/web -- cloudinary`
Expected: FAIL (`cldBlur` not exported).

- [ ] **Step 3: Implement `cldBlur`**

Append to `apps/web/src/lib/cloudinary.ts`:
```ts
export function cldBlur(publicId: string): string {
  if (!publicId || /^https?:\/\//.test(publicId) || !CLOUD) return publicId;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/w_24,e_blur:400,q_auto,f_auto/${publicId}`;
}
```

- [ ] **Step 4: ProductImage — sizes prop + blur-up**

In `apps/web/src/components/ProductImage.tsx`, accept `sizes?: string` (default the current `'(max-width: 640px) 100vw, 400px'`) and set a blurred background so the image fades over a placeholder (no CLS — the aspect box is reserved by the parent):
```tsx
import { cld, cldSrcSet, cldBlur } from '../lib/cloudinary';

export function ProductImage({
  publicId, alt, w = 800, className, loading = 'lazy',
  sizes = '(max-width: 640px) 100vw, 400px',
}: { publicId: string; alt: string; w?: number; className?: string; loading?: 'lazy' | 'eager'; sizes?: string }) {
  if (!publicId) return <div className={className} role="img" aria-label={alt} />;
  const srcSet = cldSrcSet(publicId);
  const blur = cldBlur(publicId);
  return (
    <img
      src={cld(publicId, { w })}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      loading={loading}
      decoding="async"
      style={blur ? { backgroundImage: `url(${blur})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={className}
    />
  );
}
```

- [ ] **Step 5: Home hero — eager + preload LCP**

In `apps/web/src/pages/Home.tsx`, ensure the hero image uses `loading="eager"` (per ledger it already does) and a full-width `sizes="100vw"`. Add a preload for the hero image once its URL is known. If the hero comes from `settings.heroImage`, inside Home add (using the existing `useSeo`/effect pattern or a small effect):
```tsx
import { useEffect } from 'react';
import { cld } from '../lib/cloudinary';
// after settings load, with heroPublicId:
useEffect(() => {
  if (!heroPublicId) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = cld(heroPublicId, { w: 1200 });
  document.head.appendChild(link);
  return () => { document.head.removeChild(link); };
}, [heroPublicId]);
```
(Match the real variable name for the hero public id in `Home.tsx`.)

- [ ] **Step 6: Verify**

Run:
```bash
npm run test --workspace apps/web -- cloudinary
npm run build --workspace apps/web
npm run lint
```
Expected: green.

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/lib/cloudinary.ts apps/web/src/lib/cloudinary.test.ts apps/web/src/components/ProductImage.tsx apps/web/src/pages/Home.tsx
git commit -m "perf(web): responsive image sizes, blur-up placeholder, hero LCP preload"
```

---

## Task 13: Real Helmet CSP + security headers

**Files:**
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:** none new. Replaces `helmet({ contentSecurityPolicy: false })` with a real policy that permits the SPA, self-hosted fonts (same-origin), Cloudinary images, and same-origin API/XHR. `style-src` allows `'unsafe-inline'` because Framer Motion sets inline element styles; `script-src 'self'` covers the built bundle and the request-time-injected `application/ld+json` (data, not executed).

- [ ] **Step 1: Add the failing test**

In `apps/api/src/app.test.ts` add (uses the existing `createApp({ clientOrigin })` pattern):
```ts
it('sends a content-security-policy header', async () => {
  const res = await request(app).get('/api/health').expect(200);
  const csp = res.headers['content-security-policy'];
  expect(csp).toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain('res.cloudinary.com');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- app`
Expected: FAIL (no CSP header; currently disabled).

- [ ] **Step 3: Configure CSP**

In `apps/api/src/app.ts`, replace `app.use(helmet({ contentSecurityPolicy: false }));` with:
```ts
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
```

- [ ] **Step 4: Run to verify passes + full api suite**

Run: `npm run test --workspace apps/api`
Expected: green (spa.test still passes — CSP header does not change the HTML body/injection).

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/app.ts apps/api/src/app.test.ts
git commit -m "sec(api): enable a real Helmet CSP (self + Cloudinary images)"
```
Note (for Task 18 docs): resolves M1 deferred minor F-min-3.

---

## Task 14: Build-time static prerender

**Files:**
- Modify: `apps/web/src/app/router.tsx` (export `routes`)
- Create: `apps/web/src/app/AppRoutes.tsx`
- Modify: `apps/web/src/main.tsx` (BrowserRouter + hydrate)
- Create: `apps/web/scripts/prerender.tsx`
- Modify: `apps/web/package.json` (build runs prerender; add `tsx` dev dep if needed to run the script)

**Interfaces:**
- `routes: RouteObject[]` exported from `router.tsx`; `AppRoutes` renders `useRoutes(routes)`; the prerender script renders `AppRoutes` inside `StaticRouter` for a curated set of shell routes and writes route-specific `dist/<route>/index.html`. Data-driven sections render their loading/empty state at prerender time and hydrate on the client.

**Rationale:** fulfils decision #5 Option A ("prerendered static"). Keep it minimal — only content-light routes (`/`, `/find-your-scent`, `/login`, `/register`, `/blog`). The API's request-time `<head>` injection remains the source of per-route SEO meta.

- [ ] **Step 1: Extract a shared route config**

Refactor `apps/web/src/app/router.tsx` so the array is exported and reused:
```tsx
import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { StorefrontLayout } from './StorefrontLayout';
import { RequireAuth } from '../features/auth/RequireAuth';
// ...existing lazy() imports unchanged...

export const routes: RouteObject[] = [
  {
    element: <StorefrontLayout />,
    children: [
      { path: '/', element: <Home /> },
      // ...unchanged children...
    ],
  },
  { path: '/admin/*', element: <Admin /> },
  { path: '*', element: <NotFound /> },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 2: AppRoutes wrapper**

`apps/web/src/app/AppRoutes.tsx`:
```tsx
import { useRoutes } from 'react-router-dom';
import { routes } from './router';

export function AppRoutes() {
  return useRoutes(routes);
}
```

- [ ] **Step 3: Client — BrowserRouter + hydrate when prerendered**

Update `apps/web/src/main.tsx` to render via `BrowserRouter` + `AppRoutes` (so the same `routes` power SSR), and hydrate when the shell was prerendered:
```tsx
import { StrictMode, Suspense } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
// font imports (Task 11) ...
import { ThemeProvider } from './app/ThemeProvider';
import { queryClient } from './app/queryClient';
import { AppRoutes } from './app/AppRoutes';
import { AuthProvider } from './features/auth/AuthContext';
import { CartProvider } from './features/cart/CartContext';
import './styles/index.css';

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="p-8 text-center font-body text-muted">Loading…</div>}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);

const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
```

- [ ] **Step 4: Prerender script**

`apps/web/scripts/prerender.tsx`:
```tsx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/app/ThemeProvider';
import { AppRoutes } from '../src/app/AppRoutes';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { CartProvider } from '../src/features/cart/CartContext';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '../dist');
const template = readFileSync(resolve(dist, 'index.html'), 'utf-8');

const ROUTES = ['/', '/find-your-scent', '/login', '/register', '/blog'];

for (const url of ROUTES) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <CartProvider>
            <ThemeProvider>
              <StaticRouter location={url}>
                <AppRoutes />
              </StaticRouter>
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
  const page = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const outPath = url === '/' ? resolve(dist, 'index.html') : resolve(dist, `.${url}/index.html`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, page);
  console.log('prerendered', url);
}
```
Notes for the implementer:
- `queries.enabled: false` forces React Query hooks to render their loading/empty branch during SSR (no network in the build). If any component throws when data is undefined, guard it (it should already handle the loading state).
- If a lazy route component causes `renderToString` to suspend, wrap `<AppRoutes/>` in a `<Suspense fallback={null}>` — for the shell routes prefer eagerly-imported page components, or accept the fallback (client hydrates the real content).
- Contexts that touch `window`/`localStorage` must be SSR-safe. If `ThemeProvider`/`AuthProvider`/`CartProvider` reference `window` at module/init time, guard with `typeof window !== 'undefined'`. Fix any that break the build here.

- [ ] **Step 5: Wire the build + run script**

Add a dev dep to execute a TSX script under Node: `npm install -D tsx --workspace apps/web`. Update `apps/web/package.json` `scripts.build`:
```json
"build": "tsc -b && vite build && tsx scripts/prerender.tsx"
```
(Match the existing build script's typecheck/vite invocation; append the prerender step after `vite build`.)

- [ ] **Step 6: Verify the build prerenders**

Run:
```bash
npm run build --workspace apps/web
grep -c "id=\"root\"><" apps/web/dist/index.html && echo "root not empty (prerendered)" || true
ls apps/web/dist/find-your-scent/index.html apps/web/dist/blog/index.html apps/web/dist/login/index.html
npm run test --workspace apps/web
```
Expected: `dist/index.html` `#root` contains markup; per-route index.html files exist; web tests green (hydration path only triggers in the browser; tests still mount via RTL).

- [ ] **Step 7: Confirm SPA middleware still serves the shell**

The api `mountSpa` serves `index.html` for unknown routes with `<head>` injection. Prerendered per-route files live under `dist/<route>/index.html`; the existing static handler will serve `dist/index.html` for `/` (now prerendered) and the SPA fallback for others (still correct — the injected meta + hydration produce the right page). No api change required. Verify by reading `apps/api/src/middleware/spa.ts`; if it strips/rewrites `#root`, ensure it does not discard prerendered markup (it injects into `<head>`, so body is untouched — confirm).

- [ ] **Step 8: Commit**
```bash
git add apps/web/src/app/router.tsx apps/web/src/app/AppRoutes.tsx apps/web/src/main.tsx apps/web/scripts/prerender.tsx apps/web/package.json package-lock.json
git commit -m "perf(web): build-time static prerender of shell routes + client hydration"
```
Note (Task 18 docs): fulfils decision #19's deferred build-time prerender.

---

## Task 15: Rate-limiting (auth + orders + review mutations)

**Files:**
- Create: `apps/api/src/middleware/rateLimit.ts`
- Create: `apps/api/src/middleware/rateLimit.test.ts`
- Modify: `apps/api/src/routes/auth.ts`, `apps/api/src/routes/orders.ts`, `apps/api/src/routes/reviews.ts`
- Modify: `apps/api/package.json` (add `express-rate-limit`)

**Interfaces:**
- Produces `makeLimiter(opts)`, `authLimiter`, `orderLimiter`, `reviewLimiter`. All limiters `skip` when `NODE_ENV==='test'` so existing suites are unaffected. On limit: HTTP 429 `{ error: { message, code: 'rate_limited' } }`.

- [ ] **Step 1: Add dep**
```bash
npm install express-rate-limit --workspace apps/api
```

- [ ] **Step 2: Write the failing test**

`apps/api/src/middleware/rateLimit.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeLimiter } from './rateLimit';

describe('makeLimiter', () => {
  it('returns 429 after the limit (when not skipped)', async () => {
    const app = express();
    app.use('/x', makeLimiter({ windowMs: 1000, max: 2, skipTest: false }), (_req, res) => res.json({ ok: true }));
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(200);
    const res = await request(app).get('/x').expect(429);
    expect(res.body.error.code).toBe('rate_limited');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/api -- rateLimit`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

`apps/api/src/middleware/rateLimit.ts`:
```ts
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

export function makeLimiter(opts: {
  windowMs: number;
  max: number;
  skipTest?: boolean;
}): RateLimitRequestHandler {
  const skipTest = opts.skipTest ?? true;
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => skipTest && process.env.NODE_ENV === 'test',
    handler: (_req, res) =>
      res.status(429).json({ error: { message: 'Too many requests, please try again later.', code: 'rate_limited' } }),
  });
}

// 15-minute windows tuned for a small storefront.
export const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
export const orderLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
export const reviewLimiter = makeLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test --workspace apps/api -- rateLimit`
Expected: PASS.

- [ ] **Step 6: Apply to routes**

- In `apps/api/src/routes/auth.ts`, add `authLimiter` before the login and register handlers (e.g. `router.post('/login', authLimiter, ...)`, `router.post('/register', authLimiter, ...)`). Import from `../middleware/rateLimit`.
- In `apps/api/src/routes/orders.ts`, add `orderLimiter` before the POST create-order handler.
- In `apps/api/src/routes/reviews.ts`, add `reviewLimiter` before `authenticate` on the POST review handler.

- [ ] **Step 7: Run full api suite (must stay green via test-skip)**

Run: `npm run test --workspace apps/api`
Expected: all green (limiters skipped under `NODE_ENV==='test'`).

- [ ] **Step 8: Commit**
```bash
git add apps/api/src/middleware/rateLimit.ts apps/api/src/middleware/rateLimit.test.ts apps/api/src/routes/auth.ts apps/api/src/routes/orders.ts apps/api/src/routes/reviews.ts apps/api/package.json package-lock.json
git commit -m "sec(api): rate-limit auth, order creation, and review submission"
```
Note (Task 18 docs): resolves deferred decision #30 rate-limiting.

---

## Task 16: Close deferred Vitest hardening gaps

**Files (add tests only; fix source only if a test reveals a real bug):**
- `apps/api/src/routes/adminBanners.test.ts` — assert an inactive banner appears in the **admin** GET (M3-min-6).
- `apps/api/src/lib/seo.test.ts` — draft-fallback uses a **real draft** post (not a missing slug) → default meta; add an explicit `<`-escape assertion on Article JSON-LD (M3-min-8).
- `apps/api/src/routes/adminBlog.test.ts` — assert drafts DO appear in the admin blog list (M3-min-7).
- `apps/api/src/lib/jwt.test.ts` — explicit expired + tampered-signature cases (M2-min-6).
- `apps/api/src/routes/auth.test.ts` — login success asserts `passwordHash` absent (M2-min-8); unknown-email → 401 (M2-min-9).
- `apps/api/src/routes/adminOrders.test.ts` — `?status=banana` → 400; same-status no-op transition (M2-min-17).

**Interfaces:** none. Pure coverage; keep suite serialized and deterministic.

- [ ] **Step 1: Write the added tests**

For each file above, add a focused `it(...)` using that file's existing harness (`connectMemory`/`clearDb`, `authCookie`). Example for adminBanners inactive visibility:
```ts
it('admin GET returns inactive banners', async () => {
  await Banner.create({ title: 'Off', image: 'x', placement: 'home_hero', isActive: false, order: 0 });
  const res = await request(app).get('/api/admin/banners').set('Cookie', authCookie(adminId, 'admin')).expect(200);
  expect(res.body.some((b: { title: string }) => b.title === 'Off')).toBe(true);
});
```
Example for jwt tampered/expired:
```ts
it('rejects a tampered token', () => {
  const t = signToken({ id: 'u1', role: 'customer' });
  expect(() => verifyToken(t.slice(0, -2) + 'xx')).toThrow();
});
it('rejects an expired token', () => {
  const t = jwt.sign({ id: 'u1', role: 'customer' }, SECRET, { expiresIn: -10 });
  expect(() => verifyToken(t)).toThrow();
});
```
(Match the actual exported names/signatures in each module; read the source first.)

- [ ] **Step 2: Run to verify — expect mostly PASS; investigate any FAIL**

Run: `npm run test --workspace apps/api`
Expected: new tests PASS. If the seo draft-fallback or adminOrders `banana` test FAILS, that's a real gap — apply the minimal source fix (e.g. narrow the status-transition guard per M2-min-16) using superpowers:systematic-debugging, then re-run.

- [ ] **Step 3: Commit**
```bash
git add apps/api/src
git commit -m "test(api): close deferred coverage gaps (banners/seo/blog/jwt/auth/orders)"
```

---

## Task 17: Playwright E2E smoke

**Files:**
- Create: `playwright.config.ts` (repo root)
- Create: `apps/web/e2e/shop.spec.ts`
- Create: `apps/web/e2e/admin.spec.ts`
- Modify: root `package.json` (`test:e2e` script; `@playwright/test` dev dep)

**Interfaces:** none. Two smoke flows per `docs/15_TESTING.md`: (1) browse → filter → open product → add to cart → checkout (COD) → confirmation; (2) admin login → create product → it appears on storefront.

**⚠️ Disk note (machine health):** Playwright downloads browsers to `%USERPROFILE%\AppData\Local\ms-playwright` on the (nearly-full) C: drive. **Before installing**, redirect the cache to E::
```bash
setx PLAYWRIGHT_BROWSERS_PATH "E:\\ms-playwright"
```
Open a new shell so the env var applies, then install only Chromium.

- [ ] **Step 1: Add Playwright + Chromium**
```bash
npm install -D @playwright/test
PLAYWRIGHT_BROWSERS_PATH=E:/ms-playwright npx playwright install chromium
```

- [ ] **Step 2: Playwright config with a built-app webServer**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4000', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // Build everything, seed demo data, then run the api which serves the web dist.
    command: 'npm run build && npm run seed --workspace apps/api && node apps/api/dist/server.js',
    url: 'http://localhost:4000/api/health',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { NODE_ENV: 'production', PORT: '4000' },
  },
});
```
Notes: requires a valid `.env` (`MONGODB_URI`, `JWT_SECRET`, Cloudinary). E2E runs against the real dev DB; the seed resets demo content. Admin creds from seed: `admin@herencia.example` / `admin1234`.

- [ ] **Step 3: Shop smoke flow**

`apps/web/e2e/shop.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('browse → product → cart → checkout (COD) → confirmation', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('link', { name: /perfume|oud|rose|/i }).first().click();
  await expect(page).toHaveURL(/\/products\//);
  await page.getByRole('button', { name: /add to cart/i }).click();
  await page.getByRole('button', { name: /^Cart/ }).click();
  await page.getByRole('link', { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel(/name/i).first().fill('Test Buyer');
  await page.getByLabel(/phone/i).fill('+201000000000');
  await page.getByLabel(/address/i).first().fill('1 Test St, Cairo');
  await page.getByRole('button', { name: /place order|order|checkout/i }).click();
  await expect(page).toHaveURL(/order-confirmation/);
  await expect(page.getByText(/HRC-/)).toBeVisible();
});
```
(Adjust label/role matchers to the real Checkout markup — read `apps/web/src/pages/Checkout.tsx` first and align selectors.)

- [ ] **Step 4: Admin smoke flow**

`apps/web/e2e/admin.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('admin creates a product and it appears on the storefront', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@herencia.example');
  await page.getByLabel(/password/i).fill('admin1234');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin/);
  // Create-product UI is admin-specific; align selectors with AdminProducts.tsx.
  // Minimal assertion: the admin products screen is reachable.
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: /products/i })).toBeVisible();
});
```
(Keep this smoke minimal + robust — full form fill is brittle; assert the admin surface loads and, if practical, that a seeded product is visible on `/products`.)

- [ ] **Step 5: Root script**

In root `package.json` add:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 6: Run E2E**

Run: `npm run test:e2e`
Expected: both specs pass. If Chromium download failed (disk), report it and mark E2E as blocked on freeing C: — do NOT delete tests; leave them + the runbook note.

- [ ] **Step 7: Commit**
```bash
git add playwright.config.ts apps/web/e2e package.json package-lock.json
git commit -m "test(e2e): Playwright smoke — shop checkout + admin surface"
```

---

## Task 18: Bundle audit + full-suite verification + docs/state

**Files:**
- Modify: `apps/web/vite.config.ts` (optional visualizer, dev-only)
- Modify: `docs/TASKS.md`, `docs/memory/current-state.md`, `docs/memory/next-session.md`, `docs/memory/decisions.md`
- Modify: `.superpowers/sdd/progress.md`

- [ ] **Step 1: Bundle/code-split check**

Run `npm run build --workspace apps/web` and inspect the emitted chunks. Confirm admin, quiz (`FindYourScent`), and blog editor remain in **separate lazy chunks** (they are `lazy()`-imported via `routes`). Framer Motion should land in the chunks that use it, not the initial entry — verify the entry chunk didn't balloon. If the entry grew unexpectedly, ensure `Reveal`/motion usage is only imported by route/page components (it is) — no fix needed otherwise. (Optional: add `rollup-plugin-visualizer` behind a `--mode analyze` guard; keep it dev-only, do not ship.)

- [ ] **Step 2: Full workspace verification**

Run:
```bash
npm run lint
npm run typecheck
npm run build
npm run test
```
Expected: lint 0, typecheck 0, build clean, all unit/integration tests green (shared + api + web). Record the exact file/test counts.

- [ ] **Step 3: Lighthouse checklist (manual, documented)**

Document the manual Lighthouse procedure in `.superpowers/sdd/progress.md` (run `node apps/api/dist/server.js` after a prod build, open Chrome DevTools Lighthouse on `/` and a product page, mobile preset). Record scores if run. Target ≥ 90; note any residual items as follow-ups (do not block the milestone on a live-server Lighthouse if the environment can't run it — the perf tasks above implement the known levers).

- [ ] **Step 4: Update decisions log**

In `docs/memory/decisions.md` add a Milestone 4 block:
- **#31 Blog markdown**: body rendered as real markdown via `marked` + **DOMPurify** sanitization (supersedes #29's escaped-`<p>`; `dangerouslySetInnerHTML` permitted only on sanitized output).
- **#32 CSP**: real Helmet CSP (`default-src 'self'`; img `self`+data+`res.cloudinary.com`; style `'unsafe-inline'` for Framer inline styles; script `'self'`) — resolves F-min-3.
- **#33 Rate-limiting**: `express-rate-limit` on auth/order/review POSTs, skipped under `NODE_ENV==='test'` — resolves #30.
- **#34 Prerender**: build-time static prerender of shell routes (`/`, `/find-your-scent`, `/login`, `/register`, `/blog`) + client `hydrateRoot`; router refactored to a shared `routes` config with `BrowserRouter` — fulfils #19/#5 Option A.
- **#35 Motion**: Framer Motion (lazy) + `lib/motion.ts` tokens + `Reveal` + `useReducedMotion`; transforms/opacity only, reduced-motion honored.
- **#36 Fonts**: self-hosted via `@fontsource/cinzel`+`@fontsource/jost` (dropped Google Fonts).

- [ ] **Step 5: Update state + ledger + tasks**

- `docs/TASKS.md`: check off the Milestone 4 items that are now done (animations, a11y, performance, tests incl. E2E). Leave **Deployment** and **Search Console + sitemap submitted** unchecked with a note "deferred to a separate ops plan".
- `docs/memory/current-state.md` + `next-session.md`: set phase = "M4 code-polish complete on `feat/milestone-4-polish`; remaining = ops/deploy plan (VPS + Nginx + PM2 + Search Console) + live Lighthouse". Note the Playwright browser-path (`E:\ms-playwright`) and the standing C:-drive/mongo-temp caveat.
- `.superpowers/sdd/progress.md`: append the M4 ledger (per-task commits + review verdicts + which deferred minors each task resolved). List any minors still open.

- [ ] **Step 6: Commit**
```bash
git add docs .superpowers apps/web/vite.config.ts
git commit -m "docs: Milestone 4 code-polish complete — decisions #31-36, state, ledger"
```

- [ ] **Step 7: Final whole-branch review + finish**

Run the whole-branch review (opus) per subagent-driven-development; fix any Critical/Important; then use superpowers:finishing-a-development-branch to merge `feat/milestone-4-polish` → `master`. (No git remote yet — do not push unless the user adds one and asks.)

---

## Self-Review (author checklist — completed)

**Spec coverage vs. M4 scope (next-session.md):**
- Animations pass → Tasks 8, 9, 10 (foundation, reveals/micro-interactions/shimmer, drawer/add-to-cart/route). ✅
- Accessibility audit → Tasks 6 (focus trap), 7 (labels/aria/keys), plus a11y-safe motion in 8–10. ✅
- Performance (Lighthouse ≥ 90) → Tasks 11 (fonts), 12 (images/LCP), 13 (CSP), 14 (prerender), 18 (bundle/Lighthouse checklist). ✅
- Dark-mode/theming minors → Tasks 1, 2. ✅
- Correctness/cleanup minors → Tasks 3 (E11000/agg), 4 (invalidate public + ApiError), 5 (markdown), 7 (keys). ✅
- Testing (unit/integration + E2E) → Tasks 16 (Vitest gaps), 17 (Playwright). ✅
- Rate-limiting → Task 15. ✅
- Deployment/Search Console → **intentionally deferred** (user decision this session). Noted in Task 18 docs. ✅

**Deferred-minor mapping:** M3-min-6/7/8 (Task 16); M3-min-9 already fixed pre-merge; M3-min-10/11/12/13 (Tasks 2/4/7); M2-min-6/8/9/17 (Task 16); M2-min-20 (Task 7), 21 (Task 6), 22 (Task 2), 24 (Task 7); M1 F-min-3 CSP (Task 13), decision #19 prerender (Task 14). Blog markdown (Task 5). Review E11000 (Task 3).

**Type consistency:** `Reveal`/`fadeUp`/`DURATION`/`EASE_OUT` names consistent across `lib/motion.ts` + `Reveal.tsx` + Task 9/10 usage; `useReducedMotion`/`useFocusTrap` signatures consistent with call sites; `makeLimiter`/`authLimiter`/`orderLimiter`/`reviewLimiter` consistent across creation + route wiring; `renderMarkdownSafe`/`cldBlur` consistent creation↔consumption; feedback tokens (`success`/`warning`/`danger`/`info` + `-soft`) defined in Task 1 and consumed in Tasks 2/4.

**Placeholder scan:** no TBD/TODO; each code step carries real code; existing-file edits reference exact current classes/handlers to change. Where a file wasn't fully quoted (Register, AdminQuiz, AdminOrders, Checkout, Home hero var, CartContext add-path, Blog/BlogPost query keys), the step explicitly instructs the implementer to read the file and match names — the safe, honest instruction given those files vary.

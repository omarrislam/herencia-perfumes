# 11 — Admin Dashboard

Role-gated (`role: admin`), under `/admin/*`, lazy-loaded as a separate bundle so it never
weighs down the storefront. Same design system, denser/utilitarian layout.

## Sections
1. **Dashboard** — KPIs: orders today/total, revenue (EGP), pending orders, low-stock
   products, pending reviews, recent orders list.
2. **Products** — list (search/filter), create/edit (perfume or bundle), image upload
   (Cloudinary), sizes & stock, scent family, notes pyramid, gender, concentration,
   featured/active toggles, SEO fields. Bundles pick included products + qty.
3. **Orders** — list/filter by status; detail view (items snapshot, customer, address);
   change status (pending → confirmed → shipped → delivered/cancelled); copy WhatsApp link.
4. **Reviews** — moderation queue: approve/reject/delete; recompute product rating.
5. **Banners** — CRUD with placement + scheduling (`startsAt`/`endsAt`) + active toggle.
6. **Blog** — CRUD posts (markdown), publish toggle, cover image, tags, SEO.
7. **Quiz** — manage questions/answers and answer→scent/gender weights.
8. **Settings** — WhatsApp number, shipping fee, free-shipping threshold, social links,
   hero content, contact email.

## Behaviors
- All mutations validated (shared Zod) and rate-limited.
- Optimistic UI where safe; clear success/error toasts.
- Destructive actions confirmed.
- Tables: pagination, search, empty/loading states.

## Access
- Login via the same auth; admin links only render for admins. Server enforces role on
  every `/api/admin/*` route regardless of client.

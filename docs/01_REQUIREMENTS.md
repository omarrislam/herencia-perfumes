# 01 — Requirements

## Functional

### Storefront
- Home with hero, featured perfumes, bundles, offer banners, quiz CTA, brand story.
- Product catalog with **search**, **filters** (scent family, gender, price,
  concentration), and **sort**.
- Product detail: image gallery, notes pyramid (top/heart/base), size selection,
  price (EGP), stock state, ratings & reviews, related products, add to cart.
- Bundles listing + bundle detail (shows included products).
- **Find Your Scent** quiz → personalized recommendations.
- Cart (persisted locally + to account when logged in).
- **Checkout (COD)**: capture customer + shipping info → create order → WhatsApp
  confirmation link → confirmation page.
- Blog index + post pages (markdown content).
- Auth: register, login, logout; account area with profile, orders, wishlist.
- Ratings & reviews (logged-in customers; admin-moderated).
- Offer banners.
- **Dark mode** toggle.

### Admin (role-gated)
- Dashboard: orders count, revenue (EGP), low stock, recent reviews.
- Products CRUD (perfumes + bundles), image upload, stock, SEO fields.
- Orders: list, view, change status (pending → confirmed → shipped → delivered/cancelled).
- Reviews moderation (approve/reject).
- Banners CRUD with scheduling.
- Blog CRUD.
- Quiz configuration (questions, answer → scent mapping).
- Site settings (WhatsApp number, shipping fee, social links, hero content).

## Non-functional
- **Performance:** Lighthouse ≥ 90 (mobile), small JS bundles, fast LCP.
- **SEO:** server-injected meta, JSON-LD, sitemap, semantic HTML.
- **Responsive:** mobile-first, works great on all breakpoints.
- **Accessible:** keyboard nav, focus states, color contrast, reduced-motion support.
- **Secure:** see `docs/14_SECURITY.md`.
- **Maintainable:** clean code, small modules, shared types, no overengineering.

## Constraints / assumptions
- English only (LTR). EGP only. COD only (no online payments in phase 1).
- 3–4 products at launch; model must extend cleanly.
- Single VPS deployment.

## Acceptance (phase 1 done when)
- A visitor can browse, filter, search, take the quiz, add to cart, and place a COD
  order that produces a WhatsApp confirmation link and an admin-visible order.
- An admin can manage all content (products, bundles, orders, reviews, banners, blog,
  quiz, settings) from the dashboard.
- Lighthouse mobile ≥ 90 on Home and Product detail.
- Dark mode works site-wide. Brand identity is faithfully applied.

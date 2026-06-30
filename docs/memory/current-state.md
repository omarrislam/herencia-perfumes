# Current State

_Last updated: 2026-07-01_

## Phase
**Milestone 2 (Commerce) COMPLETE & MERGED to `master` (merge commit `ed6036e`, feature branch deleted). Next = Milestone 3 (Engagement).**
Final whole-branch review (opus) = READY TO MERGE (no Critical/Important blockers); tests re-verified green on merged `master`. Full workspace green: `npm run lint` (0), `npm run typecheck` (0), `npm run build` (clean), `npm run test` — **api 76, web 22, shared ~28** all passing.

## Milestone 2 deliverables (branch `feat/milestone-2-commerce`)
- **Shared:** auth/account/cart/order Zod schemas + DTOs; `ORDER_STATUS` + `ORDER_STATUS_TRANSITIONS` (Tasks 1–2).
- **Carry-overs (Task 3):** `[F-min-5]` related route now type-filters; `[F-min-4]` ProductCard pairs basePrice with its own size's compareAt.
- **API auth (Tasks 4–5):** `lib/jwt`, `lib/authCookie`, `middleware/auth` (authenticate/requireAuth/requireRole); `requireAdmin` internals swapped to JWT-cookie+admin-role (interim `x-admin-token`/`ADMIN_TOKEN`/`AdminTokenGate` fully removed); register/login/logout/me; User gained `addresses`+`wishlist`; seed admin password (bcrypt 12).
- **API cart (Task 6):** `Cart` model + `priceItems` service (DB-authoritative pricing, unavailable lines excluded, shipping/threshold rules) + `/api/cart` price(public)/get/put/merge.
- **API orders (Tasks 7–8):** `Order` model, `lib/whatsapp` + `lib/orderNumber`, `createOrder` (re-price → atomic stock decrement w/ rollback → WhatsApp link), `POST /orders` (guest-allowed) + `GET /orders/me`; admin order list (filter/paginate) + status-lifecycle PUT (422 on illegal). `HttpError` gained optional `details`.
- **API account (Task 9):** profile, addresses CRUD (single-default invariant), wishlist add/list/remove.
- **Web (Tasks 10–14):** AuthContext + login/register + RequireAuth/RequireAdmin (token gate removed); CartContext (guest localStorage + merge-on-login, login-race fixed) + drawer + `/cart` + add-to-cart; COD checkout + WhatsApp confirmation; account area + WishlistButton; admin orders UI.
- **SDD ledger:** `.superpowers/sdd/progress.md` — Tasks 1–14 reviewed+fixed (4 Important fixes applied across Tasks 4/7/11/13); Minor findings triaged by the final review.

## Done
- Milestones 0 + 1 complete and merged to `master` (M1 merge `423e763`).
- Milestone 2 built via subagent-driven development (Tasks 1–15), each task spec+quality reviewed, final whole-branch review (opus) = READY TO MERGE.

## In progress
- Nothing — Milestone 2 complete and merged to `master`. Ready to start Milestone 3.

## Next (todo)
- **Milestone 3 (Engagement):** ratings & reviews + admin moderation, Find Your Scent quiz, offer banners, blog. Same workflow: writing-plans → review → subagent-driven-development on `feat/milestone-3-engagement`.

## Resolved open items
- Auth, cart, checkout, orders, account, admin-orders all implemented and green.
- Price integrity verified end-to-end by the final review: client never sends/persists a price; `priceItems` is single-sourced.

## Notes
- ⚠️ **C: drive still ~full** — MongoMemoryServer api tests rely on the win32 temp redirect to E: in `apps/api/vitest.config.ts` (+ a test `JWT_SECRET` injected there). Free up C: and replace the redirect for CI/VPS.
- Deferred (M3): test-coverage minors (M2-min-1/2/3/5/6/8/9/14/16/17/19). Deferred (M4 polish/a11y): M2-min-11 (router future-flags + act() warnings), M2-min-20/21/24 (aria-labels, CartDrawer focus trap), M2-min-22 (raw `bg-gold/10`), M2-min-23 ("(optional)" copy), plus new minors from final review: CartContext writes the logged-in cart to guest localStorage on logout (privacy on shared devices — or product decision), WishlistButton initial heart state not server-derived. Full list at the bottom of the SDD ledger.
- `.env` has `JWT_SECRET` (used) + the now-ignored `ADMIN_TOKEN` (harmless leftover key); `ADMIN_TOKEN` removed from `.env.example` and the env schema.
- Seed: `npm run seed --workspace apps/api` → families, perfumes, bundles, Settings (with shipping fields), admin user `admin@herencia.example` / `admin1234`.

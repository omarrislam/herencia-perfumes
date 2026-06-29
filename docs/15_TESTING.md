# 15 — Testing

Pragmatic, not exhaustive (per "don't overengineer"). Test logic and critical flows;
skip trivial glue.

## Tools
- **Vitest** — unit tests (api services, utils, validators, cart/quiz logic).
- **Supertest + Vitest** — API integration (auth, products, orders, reviews).
- **React Testing Library** — key components (ProductCard, Cart, forms, Rating).
- **Playwright** — a few end-to-end smoke flows.

## What to test (priority)
1. **Checkout math & order creation** — totals, stock validation, WhatsApp link.
2. **Auth** — register/login/logout, role guards (admin routes reject non-admins).
3. **Cart logic** — add/update/remove, persistence, merge on login.
4. **Quiz mapping** — answers → recommended products.
5. **Reviews** — create pending, admin approve recomputes rating.
6. **Validation** — Zod schemas reject bad input at the boundary.

## E2E smoke (Playwright)
- Browse → filter/search → open product → add to cart → checkout (COD) → confirmation.
- Admin login → create product → it appears on storefront.

## Conventions
- TDD for logic-bearing code: red → green → refactor.
- Tests colocated or in `__tests__` per module. Deterministic; seed/teardown test DB.
- CI runs lint + typecheck + unit/integration on every push; E2E on demand/milestones.

## Definition of done (testing)
- New logic has tests. No failing tests merged. Typecheck + lint clean.

# 05 — API

REST, JSON, under `/api`. Auth via httpOnly JWT cookie. Validation via shared Zod
schemas. Errors use a consistent shape: `{ error: { message, code, details? } }`.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | name, email, password → sets cookie |
| POST | `/api/auth/login` | email, password → sets cookie |
| POST | `/api/auth/logout` | clears cookie |
| GET | `/api/auth/me` | current user |

## Products
| Method | Path | Notes |
|---|---|---|
| GET | `/api/products` | query: `q, type, scentFamily, gender, concentration, minPrice, maxPrice, sort, page` |
| GET | `/api/products/:slug` | single product |
| GET | `/api/products/:slug/related` | related items |
| POST/PUT/DELETE | `/api/admin/products...` | admin CRUD |

## Bundles
Served via `/api/products?type=bundle`; admin CRUD via admin products with `type: bundle`.

## Scent families
`GET /api/scent-families` · admin CRUD under `/api/admin/scent-families`.

## Reviews
| Method | Path | Notes |
|---|---|---|
| GET | `/api/products/:slug/reviews` | approved reviews |
| POST | `/api/products/:slug/reviews` | auth; creates pending review |
| PUT | `/api/admin/reviews/:id` | approve/reject |
| DELETE | `/api/admin/reviews/:id` | remove |

## Cart & Orders
Cart is client-side; server validates at checkout.
| Method | Path | Notes |
|---|---|---|
| POST | `/api/orders` | validate items/stock, create COD order, return order + WhatsApp link |
| GET | `/api/orders/me` | auth; customer's orders |
| GET | `/api/admin/orders` | admin list/filter |
| PUT | `/api/admin/orders/:id/status` | change status |

## Quiz
| GET | `/api/quiz` | questions |
| POST | `/api/quiz/result` | answers → recommended products |

## Banners
`GET /api/banners` (active, by placement) · admin CRUD.

## Blog
`GET /api/blog`, `GET /api/blog/:slug` · admin CRUD.

## Settings
`GET /api/settings` (public subset) · `PUT /api/admin/settings`.

## Account
`GET/PUT /api/account/profile`, addresses CRUD, `GET/POST/DELETE /api/account/wishlist`.

## Conventions
- Pagination: `?page=1&limit=12` → `{ items, total, page, pages }`.
- All admin routes behind role guard. Mutations rate-limited.
- WhatsApp link built server-side from `Setting.whatsappNumber` + order summary.

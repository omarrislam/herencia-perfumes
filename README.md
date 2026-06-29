# HERENCIA

> Premium heritage perfume brand e-commerce — *"Luxury in every drop."*

A lightweight but rich storefront + admin dashboard for the HERENCIA fragrance brand.
Mobile-first, fast, SEO-strong, with a faithful luxury identity.

## Stack
- **Frontend:** Vite + React + TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Node + Express + TypeScript, MongoDB (Mongoose)
- **Shared:** TypeScript types + Zod schemas (`packages/shared`)
- **Images:** Cloudinary · **Hosting:** single VPS (Nginx + PM2)

## Highlights
- Catalog (perfumes + bundles) with search, filters, sort
- Product detail with notes pyramid, sizes, ratings & reviews
- "Find Your Scent" quiz · Blog · Offer banners
- Cart + **COD checkout** with WhatsApp order confirmation
- Full **admin dashboard** controlling all site content
- **Dark mode**, English (LTR), currency **EGP**

## Project status
Planning complete; implementation pending. See:
- **Spec:** `docs/superpowers/specs/2026-06-29-herencia-design.md`
- **Docs:** `docs/00_PROJECT.md` … `docs/17_ROADMAP.md`
- **Tasks:** `docs/TASKS.md`
- **Live state:** `docs/memory/current-state.md`
- **Rules:** `docs/02_CLAUDE_RULES.md`

## Repo layout (planned)
```
apps/web      # storefront + admin SPA
apps/api      # REST API + serves web build + SEO
packages/shared  # shared types & schemas
docs/         # specs, rules, memory, tasks
identity/     # brand assets
```

## Getting started
> Scaffolding not generated yet. Once Milestone 0 lands:
> `npm ci && npm run dev` (see `docs/16_DEPLOYMENT.md`).

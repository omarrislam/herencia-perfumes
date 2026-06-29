# Decisions Log

Locked decisions. **Do not re-litigate** without explicit user change. Newest at bottom.

_2026-06-29_

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Language | English only (LTR) | User choice; drops i18n/RTL complexity |
| 2 | Currency | EGP | User confirmed; market is Egypt |
| 3 | Checkout | COD + WhatsApp order capture, no gateway | Lightweight starter; COD common in Egypt |
| 4 | Catalog | Perfumes + bundles | User choice |
| 5 | Rendering/SEO | Option A — SSR-lite (SPA + server-injected meta + prerendered static) | Balances SEO, performance, "lightweight" |
| 6 | Hosting | Single VPS (Node serves API + web) | User deferred; fits Option A, cheap |
| 7 | Auth | JWT in httpOnly cookie; roles customer/admin | Secure, simple |
| 8 | Images | Cloudinary (WebP/AVIF, responsive) | Performance + image quality |
| 9 | Animations | Framer Motion + CSS, lazy, prefers-reduced-motion | Engaging but perf-safe |
| 10 | Styling | Tailwind CSS + CSS-var brand tokens | Tiny output, fast, theme-able |
| 11 | Dark mode | Yes, `data-theme` | Required by user |
| 12 | Monorepo | npm workspaces (web/api/shared) | Light; shared types; no Nx/Turbo |
| 13 | Phasing | Build everything in phase 1 (incl. quiz + blog) | User choice |
| 14 | State persistence | Update memory + TASKS at every checkpoint | User requirement |
| 15 | Fonts | Cinzel (display) + Jost (body/UI) | Elegant heritage pairing, perf-friendly variable font |
| 16 | Images | Cloudinary confirmed by user | Performance + image quality |
| 17 | Spec | Approved by user 2026-06-29 | Ready for implementation planning |

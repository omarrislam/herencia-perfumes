# 09 — Design System

Derived from `/identity`. Implemented as CSS custom properties mapped into Tailwind.

## Brand colors
| Token | Hex | Use |
|---|---|---|
| `--maroon` | `#4B1D1D` | primary brand, headers, dark surfaces |
| `--gold` | `#C29A5B` | accents, borders, CTAs, highlights |
| `--cream` | `#F5EBC6` | light backgrounds, surfaces |
| `--parchment` | `#EBD6B1` | secondary light surface, sections |

### Light theme
- bg: cream/parchment; surface: `#FFFDF6`; text: maroon `#4B1D1D`; muted: `#6b5b4b`;
  accent: gold; border: gold @ low opacity.

### Dark theme (derived)
- bg: `#1A0E0E` (maroon-black); surface: `#241414`; text: `#F5EBC6` (cream);
  muted: `#C9B79A`; accent: gold; border: gold @ low opacity.

Theme switched via `data-theme="light|dark"` on `<html>`; tokens redefined per theme.

## Typography
- **Display / headings:** **Cinzel** (matches the crest). Weights 400/600/700.
- **Body / UI:** **Jost** — refined geometric sans (variable font), self-hosted + subset,
  comfortable line-height. Pairs with Cinzel for an elegant heritage-meets-modern feel.
- Scale (mobile→desktop, fluid `clamp`): h1 2rem→3rem, h2 1.5rem→2.25rem, h3 1.25rem→1.5rem,
  body 1rem, small 0.875rem.
- `font-display: swap`; preload primary weights; subset to Latin.

## Spacing / radius / shadow
- Spacing scale: 4,8,12,16,24,32,48,64.
- Radius: sm 6px, md 10px, lg 16px, pill 999px.
- Shadow: subtle (`0 2px 8px rgba(75,29,29,.08)`), elevated for modals/drawers.

## Motifs
- Shield/crest mark from `/identity/logo.jpeg` (export to optimized SVG/PNG).
- Gold hairline dividers; optional subtle parchment texture on section backgrounds.
- Keep ornamentation sparing — premium, not busy.

## Tailwind mapping
- Extend `theme.colors` with `maroon/gold/cream/parchment` and semantic tokens
  (`bg`, `surface`, `text`, `muted`, `accent`, `border`) bound to CSS vars so dark mode
  works without class duplication.

## Assets to produce
- Logo SVG (color + monochrome), favicon set, OG default image, apple-touch-icon.

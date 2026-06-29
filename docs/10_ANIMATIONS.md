# 10 — Animations

Engaging but performance-safe. Framer Motion + CSS. Lazy-loaded so motion code never
blocks first render.

## Hard rules
- **Transforms & opacity only** (GPU-composited). Never animate layout properties
  (width/height/top/left) that cause reflow.
- **No CLS.** Reserve space; never shift content on load.
- **Never delay LCP.** Above-the-fold hero content is visible immediately; entrance
  animation may fade in supporting elements only.
- **Respect `prefers-reduced-motion`** — provide a near-instant, motion-free path.
- Keep durations short (150–400ms), easing natural (`ease-out` / spring with low stiffness).

## Where motion is used
- Section reveals on scroll (IntersectionObserver → fade/slide-up, small distance).
- Product card hover: subtle lift + gold border + image zoom (contained).
- Buttons: micro press/hover feedback.
- Logo: gentle gold shimmer (CSS, low-frequency, reduced-motion off).
- Cart drawer + modals: slide/scale with backdrop fade.
- Page transitions: light cross-fade; avoid heavy route animations on mobile.
- Add-to-cart: small confirmation pulse/toast.

## Implementation notes
- Wrap Framer Motion usage so it's tree-shakeable and lazy where heavy.
- Centralize timing/easing tokens (e.g., `lib/motion.ts`) for consistency.
- Test on a mid-range phone profile; if a 60fps frame budget is at risk, simplify.

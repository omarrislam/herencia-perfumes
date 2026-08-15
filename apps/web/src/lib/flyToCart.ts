/** Marks the element the clone should fly toward (the header cart button). */
export const CART_TARGET_ATTR = 'data-cart-target';

const DURATION_MS = 700;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Sends a copy of the product image arcing into the cart button.
 *
 * The point is comprehension, not decoration: it answers "where did that go?"
 * at the exact moment a customer commits, which is why it is worth the frames.
 *
 * Uses the Web Animations API rather than a library — this is a handful of
 * keyframes and the storefront bundle is on a Lighthouse budget. Everything is
 * transform/opacity on a fixed-position clone, so it never touches layout and
 * cannot shift the page.
 *
 * No-ops rather than half-works when: reduced motion is requested, the source
 * or target is missing, or the browser lacks `animate`.
 */
export function flyToCart(source: HTMLElement | null | undefined): void {
  if (!source || prefersReducedMotion()) return;
  const target = document.querySelector<HTMLElement>(`[${CART_TARGET_ATTR}]`);
  if (!target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('fly-clone');
  clone.style.left = `${from.left}px`;
  clone.style.top = `${from.top}px`;
  clone.style.width = `${from.width}px`;
  clone.style.height = `${from.height}px`;
  clone.setAttribute('aria-hidden', 'true');
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  if (typeof clone.animate !== 'function') {
    clone.remove();
    return;
  }

  // The mid-point lifts above the straight line so the path reads as an arc
  // rather than a slide — it looks deliberate instead of mechanical.
  const anim = clone.animate(
    [
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.9 },
      {
        transform: `translate3d(${dx * 0.55}px, ${dy * 0.4 - 60}px, 0) scale(0.5)`,
        opacity: 0.85,
        offset: 0.55,
      },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.12)`, opacity: 0 },
    ],
    { duration: DURATION_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
  );

  const cleanup = () => clone.remove();
  anim.addEventListener('finish', cleanup);
  anim.addEventListener('cancel', cleanup);
  // Belt and braces: a backgrounded tab can leave an animation unfinished, and a
  // stranded clone would sit over the page forever.
  setTimeout(cleanup, DURATION_MS + 400);
}

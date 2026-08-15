import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flyToCart, CART_TARGET_ATTR } from './flyToCart';

function makeTarget() {
  const el = document.createElement('button');
  el.setAttribute(CART_TARGET_ATTR, '');
  el.getBoundingClientRect = () => ({ left: 900, top: 20, width: 40, height: 40 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function makeSource() {
  const el = document.createElement('img');
  el.getBoundingClientRect = () => ({ left: 100, top: 400, width: 120, height: 120 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

type Frame = { transform: string; opacity: number; offset?: number };
const animate = vi.fn<(frames: Frame[], opts: KeyframeAnimationOptions) => { addEventListener: () => void }>(
  () => ({ addEventListener: vi.fn() }),
);

beforeEach(() => {
  document.body.innerHTML = '';
  animate.mockClear();
  // jsdom has no Web Animations API.
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
});
afterEach(() => vi.unstubAllGlobals());

const clones = () => document.querySelectorAll('.fly-clone');

describe('flyToCart', () => {
  it('animates a clone from the product toward the cart', () => {
    makeTarget();
    flyToCart(makeSource());
    expect(animate).toHaveBeenCalledTimes(1);
    expect(clones().length).toBe(1);
  });

  it('does nothing when the visitor asked for reduced motion', () => {
    makeTarget();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q }));
    flyToCart(makeSource());
    expect(animate).not.toHaveBeenCalled();
    expect(clones().length).toBe(0);
  });

  it('does nothing when there is no cart target on the page', () => {
    flyToCart(makeSource());
    expect(animate).not.toHaveBeenCalled();
    expect(clones().length).toBe(0);
  });

  it('does nothing without a source element', () => {
    makeTarget();
    flyToCart(null);
    expect(animate).not.toHaveBeenCalled();
  });

  it('does nothing when the source has no size — it would fly from nowhere', () => {
    makeTarget();
    const el = document.createElement('img');
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    document.body.appendChild(el);
    flyToCart(el);
    expect(animate).not.toHaveBeenCalled();
    expect(clones().length).toBe(0);
  });

  it('removes the clone rather than stranding it when animate is unavailable', () => {
    makeTarget();
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = undefined;
    flyToCart(makeSource());
    expect(clones().length).toBe(0);
  });

  it('hides the clone from assistive tech', () => {
    makeTarget();
    flyToCart(makeSource());
    expect(document.querySelector('.fly-clone')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('sweeps the clone up before it lands, so the path reads as an arc', () => {
    makeTarget();
    flyToCart(makeSource());
    const frames = animate.mock.calls[0]![0];
    const mid = frames[1]!.transform;
    const y = Number(/translate3d\([^,]+,\s*(-?[\d.]+)px/.exec(mid)![1]);
    // Target sits ABOVE the product, so a straight line is already negative;
    // the arc must lift further than the halfway point of that line.
    expect(y).toBeLessThan((20 + 20 - (400 + 60)) * 0.4);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HeroVideo } from './HeroVideo';

function setEnv({ reduced = false, saveData = false, effectiveType = '4g' } = {}) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced && /reduce/.test(q),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData, effectiveType },
  });
}

beforeEach(() => {
  setEnv();
  // Run the idle callback immediately so tests don't wait on the browser.
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => { cb(); return 1; });
  vi.stubGlobal('cancelIdleCallback', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

const video = (c: HTMLElement) => c.querySelector('video');

describe('HeroVideo', () => {
  it('does not render until the hero image has painted', () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready={false} />);
    expect(video(container)).toBeNull();
  });

  it('renders once the image is ready', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
  });

  it('never loads for a visitor who asked for reduced motion', async () => {
    setEnv({ reduced: true });
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await new Promise((r) => setTimeout(r, 20));
    expect(video(container)).toBeNull();
  });

  it('never loads on Save-Data', async () => {
    setEnv({ saveData: true });
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await new Promise((r) => setTimeout(r, 20));
    expect(video(container)).toBeNull();
  });

  it.each(['2g', 'slow-2g', '3g'])('never loads on a %s connection', async (effectiveType) => {
    setEnv({ effectiveType });
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await new Promise((r) => setTimeout(r, 20));
    expect(video(container)).toBeNull();
  });

  it('offers a lighter rendition to small screens', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    const sources = [...container.querySelectorAll('source')];
    expect(sources[0]!.getAttribute('src')).toBe('/hero-sm.mp4');
    expect(sources[0]!.getAttribute('media')).toContain('max-width');
    expect(sources[1]!.getAttribute('src')).toBe('/hero.mp4');
  });

  it('is muted, looping and inline — the only way autoplay is allowed on mobile', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    const v = video(container)!;
    expect(v).toHaveAttribute('loop');
    expect(v).toHaveAttribute('playsinline');
    expect((v as HTMLVideoElement).muted || v.hasAttribute('muted')).toBe(true);
  });

  it('is hidden from assistive tech and from the tab order', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect(video(container)).toHaveAttribute('aria-hidden', 'true');
    expect(video(container)).toHaveAttribute('tabindex', '-1');
  });

  it('stays transparent until it can actually play, so it never flashes', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect(video(container)!.className).toContain('opacity-0');
  });
});

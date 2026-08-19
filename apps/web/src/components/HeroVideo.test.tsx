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
  // jsdom does not implement play(); it returns undefined, exactly as older
  // browsers do — which is why the component guards before calling .catch().
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.resolve()),
  });
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
  it('sets the muted ATTRIBUTE, not just the property — iOS refuses autoplay without it', async () => {
    // React's `muted` prop only sets the DOM property. On a real iPhone that means
    // playback is blocked and the native play badge appears, while Chromium plays
    // happily and hides the bug.
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    const v = video(container)! as HTMLVideoElement;
    expect(v.hasAttribute('muted')).toBe(true);
    expect(v.muted).toBe(true);
  });

  it('asks to play explicitly and survives a blocked play()', async () => {
    const play = vi.fn(() => Promise.reject(new Error('blocked')));
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect(play).toHaveBeenCalled();
  });

  it('biases the crop left on phones so the subject is not cut out of frame', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    const cls = video(container)!.className;
    expect(cls).toContain('object-[18%_50%]');
    expect(cls).toContain('sm:object-center');
  });

  it('never shows native controls', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect((video(container) as HTMLVideoElement).controls).toBe(false);
  });
});

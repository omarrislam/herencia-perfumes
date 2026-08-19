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

  it('picks the rendition in JS, not with <source media>', async () => {
    // Safari applies the media attribute on <source> inconsistently for video and
    // can end up with no playable source at all, which is one way a hero ends up
    // paused behind a play badge. The choice is made here instead.
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect(container.querySelectorAll('source')).toHaveLength(0);
    expect(video(container)!.getAttribute('src')).toBe('/hero.mp4');
  });

  it('shows a poster so a blocked video is never a black rectangle', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect(video(container)!.getAttribute('poster')).toBe('/hero-poster.jpg');
  });

  it('retries playback on the first user gesture, for iOS Low Power Mode', async () => {
    // iOS refuses autoplay entirely in Low Power Mode; no markup overrides that.
    // A play() inside a user gesture is always permitted, so the first touch or
    // scroll starts it.
    const play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', { configurable: true, get: () => true });
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    play.mockClear();
    window.dispatchEvent(new Event('touchstart'));
    expect(play).toHaveBeenCalled();
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
    expect(cls).toContain('object-[8%_50%]');
    expect(cls).toContain('sm:object-center');
  });

  it('never shows native controls', async () => {
    const { container } = render(<HeroVideo src="/hero.mp4" ready />);
    await waitFor(() => expect(video(container)).toBeTruthy());
    expect((video(container) as HTMLVideoElement).controls).toBe(false);
  });
});

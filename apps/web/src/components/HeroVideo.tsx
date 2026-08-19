import { useCallback, useEffect, useState } from 'react';

/**
 * play() returns a Promise in modern browsers but `undefined` in older ones, so
 * the rejection handler has to be attached defensively. A blocked autoplay is
 * expected, not exceptional — it must never surface as an unhandled rejection.
 */
function tryPlay(el: HTMLVideoElement): void {
  const r = el.play() as unknown as Promise<void> | undefined;
  if (r && typeof r.catch === 'function') r.catch(() => {});
}

/**
 * Looping background video layered OVER the hero image.
 *
 * The image is never replaced — it is the poster, the fallback, and the LCP
 * element that round 13 bakes into index.html for a first paint with no JS. This
 * component only fades a video in on top once it can play, so the measured hero
 * performance is unchanged for anyone who never receives the video.
 *
 * It declines to load at all when:
 *  - the visitor asked for reduced motion,
 *  - the browser reports Save-Data or a 2g/3g connection,
 *  - or the hero image has not painted yet (never compete with LCP).
 */
export function HeroVideo({ src, ready }: { src: string; ready: boolean }) {
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Non-standard but widely shipped; treat absence as "fine to load".
    const c = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (c?.saveData) return;
    if (c?.effectiveType && /(^|-)2g$|^3g$/.test(c.effectiveType)) return;

    // Wait for an idle moment so the video never competes with the hero image
    // or the route chunk for bandwidth. requestIdleCallback is missing on older
    // Safari, hence the runtime check rather than a type-level one.
    const start = () => setAllowed(true);
    const idle = typeof window.requestIdleCallback === 'function';
    const id = idle ? window.requestIdleCallback(start) : window.setTimeout(start, 1200);
    return () => {
      if (idle) window.cancelIdleCallback?.(id);
      else clearTimeout(id);
    };
  }, [ready]);

  /**
   * iOS Safari only permits inline autoplay when the `muted` ATTRIBUTE is present
   * on the element. React's `muted` prop sets the DOM *property* and never emits
   * the attribute, so on a real iPhone playback is refused and the native play
   * button appears — while Chromium happily plays and hides the bug. Set both here,
   * before the element can attempt to play, then ask explicitly and swallow the
   * rejection (a blocked play() must not surface as an unhandled promise).
   */
  const attach = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = true;
    el.setAttribute('muted', '');
    el.defaultMuted = true;
    tryPlay(el);
  }, []);

  if (!allowed) return null;

  return (
    <video
      ref={attach}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
      onCanPlay={(e) => {
        setVisible(true);
        tryPlay(e.currentTarget);
      }}
      // object-position is biased left on phones: the frame is 854 wide inside a
      // ~390 window, so ~460px is cropped and a centred crop cuts the atomiser
      // out of shot. Larger screens lose almost nothing, so they stay centred.
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-[18%_50%] transition-opacity duration-700 ease-out sm:object-center ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Small phones get the lighter rendition; the browser picks before fetching. */}
      <source src={src.replace(/\.mp4$/, '-sm.mp4')} type="video/mp4" media="(max-width: 640px)" />
      <source src={src} type="video/mp4" />
    </video>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

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
 * only fades a video in on top once it can play, so measured hero performance is
 * unchanged for anyone who never receives the video.
 *
 * It declines to load at all under reduced motion, Save-Data, or a 2g/3g
 * connection, and waits for an idle moment so it never competes with the image.
 */
export function HeroVideo({ src, ready }: { src: string; ready: boolean }) {
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const elRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (c?.saveData) return;
    if (c?.effectiveType && /(^|-)2g$|^3g$/.test(c.effectiveType)) return;

    const start = () => setAllowed(true);
    const idle = typeof window.requestIdleCallback === 'function';
    const id = idle ? window.requestIdleCallback(start) : window.setTimeout(start, 1200);
    return () => {
      if (idle) window.cancelIdleCallback?.(id);
      else clearTimeout(id);
    };
  }, [ready]);

  /**
   * iOS refuses autoplay outright in Low Power Mode, and when "Auto-Play Video
   * Previews" is off — no markup can override either. When that happens the
   * FIRST touch or scroll anywhere on the page is a user gesture, and playback
   * started inside one is always permitted. Listeners remove themselves after
   * the first successful start.
   */
  useEffect(() => {
    if (!allowed) return;
    const kick = () => {
      const el = elRef.current;
      if (el && el.paused) tryPlay(el);
    };
    const opts = { passive: true } as AddEventListenerOptions;
    for (const ev of ['touchstart', 'pointerdown', 'scroll', 'click']) {
      window.addEventListener(ev, kick, opts);
    }
    document.addEventListener('visibilitychange', kick);
    return () => {
      for (const ev of ['touchstart', 'pointerdown', 'scroll', 'click']) {
        window.removeEventListener(ev, kick);
      }
      document.removeEventListener('visibilitychange', kick);
    };
  }, [allowed]);

  const attach = useCallback((el: HTMLVideoElement | null) => {
    elRef.current = el;
    if (!el) return;
    // React's `muted` prop sets the DOM property but never emits the attribute,
    // and iOS only permits inline autoplay when the ATTRIBUTE is present.
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute('muted', '');
    tryPlay(el);
  }, []);

  if (!allowed) return null;

  // Chosen here rather than with <source media>, which Safari applies
  // inconsistently for video and can leave with no playable source at all.
  const small = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const chosen = small ? src.replace(/\.mp4$/, '-sm.mp4') : src;

  return (
    <video
      ref={attach}
      src={chosen}
      poster="/hero-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
      onLoadedData={(e) => tryPlay(e.currentTarget)}
      onCanPlay={(e) => {
        setVisible(true);
        tryPlay(e.currentTarget);
      }}
      onPlaying={() => setVisible(true)}
      // The frame is 854 wide in a ~390 window, so a centred crop shows only
      // 27%-73% and loses the atomiser (at ~10-18%). 8% shows 4%-50%.
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-[8%_50%] transition-opacity duration-700 ease-out sm:object-center ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}

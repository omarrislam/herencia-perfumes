import { useEffect, useRef, useState } from 'react';

/**
 * Looping background video layered OVER the hero image.
 *
 * The image is never replaced — it is the poster, the fallback, and the LCP
 * element that round 13 baked into index.html for a first-paint with no JS. This
 * component only fades a video in on top once it can actually play, so the
 * measured hero performance is unchanged for anyone who never gets the video.
 *
 * It declines to load at all when:
 *  - the visitor asked for reduced motion,
 *  - the browser reports Save-Data or a 2g/3g connection,
 *  - or the hero image has not painted yet (never compete with LCP).
 */
export function HeroVideo({ src, ready }: { src: string; ready: boolean }) {
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

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

  if (!allowed) return null;

  return (
    <video
      ref={ref}
      // Muted + playsInline are what make autoplay legal on mobile at all.
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onCanPlay={() => setVisible(true)}
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Small phones get the lighter rendition; the browser picks before fetching. */}
      <source src={src.replace(/\.mp4$/, '-sm.mp4')} type="video/mp4" media="(max-width: 640px)" />
      <source src={src} type="video/mp4" />
    </video>
  );
}

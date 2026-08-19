import { useEffect, useRef, useState } from 'react';

/**
 * Wraps a badge so it lands like a rubber stamp the first time it is scrolled to.
 *
 * Safety, given round 36: an IntersectionObserver ALWAYS fires once on observe
 * with the element's current state, so anything already on screen stamps
 * immediately and can never sit invisible. When the API is missing, or the
 * visitor prefers reduced motion, it renders in its final state at once and no
 * animation is scheduled — the sticker is never gated behind an effect that
 * might not run.
 */
export function Stamp({
  children,
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // `null` means "we cannot observe, so just show it".
  const [stamped, setStamped] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;

    setStamped(false);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStamped(true);
            io.disconnect();
          }
        }
      },
      // Slightly inside the viewport, so it strikes once properly on screen
      // rather than while still clipped at the edge.
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pending = stamped === false;

  return (
    <div
      ref={ref}
      {...rest}
      className={`${className} ${pending ? 'opacity-0' : ''} ${stamped ? 'stamp-press' : ''}`}
    >
      {stamped && (
        <span
          aria-hidden="true"
          className="stamp-ink pointer-events-none absolute inset-0 rounded-full bg-accent"
        />
      )}
      {children}
    </div>
  );
}

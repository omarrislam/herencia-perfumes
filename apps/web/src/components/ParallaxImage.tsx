import { useCallback, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

// Subtle scroll parallax for editorial imagery (GPU-only: transform).
// The image is slightly scaled so the vertical drift never reveals edges,
// and fades in as one piece once loaded (no half-painted progressive scan).
export function ParallaxImage({
  src, alt, className, imgClassName = '',
}: {
  src: string; alt: string; className?: string; imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0px', '0px'] : ['-32px', '32px']);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete) setLoaded(true);
  }, []);

  return (
    <div ref={ref} className={`overflow-hidden bg-espresso/10 ${className ?? ''}`}>
      <motion.img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ y }}
        className={`h-full w-full scale-[1.15] object-cover transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
}

import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

// Subtle scroll parallax for editorial imagery (GPU-only: transform).
// The image is slightly scaled so the vertical drift never reveals edges.
export function ParallaxImage({
  src, alt, className, imgClassName = '',
}: {
  src: string; alt: string; className?: string; imgClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0px', '0px'] : ['-32px', '32px']);

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ''}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ y }}
        className={`h-full w-full scale-[1.15] object-cover ${imgClassName}`}
      />
    </div>
  );
}

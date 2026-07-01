import type { Variants } from 'framer-motion';

export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp, DURATION, EASE_OUT } from '../lib/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

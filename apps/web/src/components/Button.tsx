import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center rounded-md px-5 py-2.5 font-body text-sm font-medium tracking-wide transition-transform transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none';

const variants: Record<Variant, string> = {
  primary: 'bg-cta text-cream shadow-lux-sm hover:bg-cta-hover hover:shadow-lux',
  secondary: 'border border-accent text-content hover:bg-accent hover:text-surface',
  ghost: 'text-content hover:text-accent hover:bg-accent/5',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

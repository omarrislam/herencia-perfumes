import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: '#4B1D1D',
        // Fixed deep maroon-black for "always dark" surfaces (feature bands,
        // primary buttons, image overlays) — does NOT flip with the theme.
        espresso: '#241111',
        gold: '#C29A5B',
        cream: '#F5EBC6',
        parchment: '#EBD6B1',
        // semantic tokens bound to CSS vars (theme-aware)
        bg: 'var(--bg)',
        'bg-deep': 'var(--bg-deep)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        content: 'var(--text)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'gold-hi': 'var(--gold-hi)',
        line: 'var(--border)',
        hairline: 'var(--hairline)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning: 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Jost', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lux: 'var(--shadow-md)',
        'lux-lg': 'var(--shadow-lg)',
        'lux-sm': 'var(--shadow-sm)',
      },
      letterSpacing: {
        luxe: '0.28em',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
} satisfies Config;

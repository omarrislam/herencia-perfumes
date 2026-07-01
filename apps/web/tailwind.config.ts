import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: '#4B1D1D',
        gold: '#C29A5B',
        cream: '#F5EBC6',
        parchment: '#EBD6B1',
        // semantic tokens bound to CSS vars (theme-aware)
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        content: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        line: 'var(--border)',
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
    },
  },
  plugins: [],
} satisfies Config;

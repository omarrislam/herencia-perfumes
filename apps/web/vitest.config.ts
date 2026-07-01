import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Playwright E2E specs live in apps/web/e2e and must not be collected by Vitest.
    exclude: [...configDefaults.exclude, '**/e2e/**'],
  },
});

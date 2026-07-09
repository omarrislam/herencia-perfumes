import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Manifest feeds scripts/preload-home.mjs (modulepreload of the landing route).
  build: { manifest: true },
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});

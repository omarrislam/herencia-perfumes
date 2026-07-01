import { defineConfig } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse the root .env file into a plain object.
 * Needed because the webServer subprocess does not inherit the parent shell's
 * dotenv-loaded vars; the seed + API server both call loadEnv(process.env).
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      // Strip surrounding quotes if any
      const raw = trimmed.slice(eqIdx + 1).trim();
      const val = raw.replace(/^(["'])(.*)(\1)$/, '$2');
      if (key) vars[key] = val;
    }
  } catch {
    /* .env absent is fine in CI where env vars are set externally */
  }
  return vars;
}

const rootEnv = parseEnvFile(join(process.cwd(), '.env'));

export default defineConfig({
  testDir: './apps/web/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4000', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // Build everything, seed demo data, then run the api which serves the web dist.
    command:
      'npm run build && npm run seed --workspace apps/api && node apps/api/dist/server.js',
    url: 'http://localhost:4000/api/health',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Spread all .env values first, then override what Playwright needs
      ...rootEnv,
      NODE_ENV: 'production',
      PORT: '4000',
      // In production mode the API serves the web dist on the same port
      CLIENT_ORIGIN: 'http://localhost:4000',
      PLAYWRIGHT_BROWSERS_PATH: 'E:/ms-playwright',
    },
  },
});

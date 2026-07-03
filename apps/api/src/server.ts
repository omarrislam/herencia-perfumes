import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { ensureSampleBox } from './lib/ensureSampleBox';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function connectWithRetry(uri: string, attempts = 6): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[api] Mongo connect attempt ${i}/${attempts} failed: ${msg}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function main() {
  const env = loadEnv(process.env);
  await connectWithRetry(env.MONGODB_URI);
  await ensureSampleBox();
  const webDistCandidate = path.resolve(__dirname, '../../web/dist');
  const webDist = existsSync(path.join(webDistCandidate, 'index.html')) ? webDistCandidate : undefined;
  const app = createApp({
    clientOrigin: env.CLIENT_ORIGIN,
    webDist,
    origin: env.CLIENT_ORIGIN,
  });
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

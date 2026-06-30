import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const webDistCandidate = path.resolve(__dirname, '../../web/dist');
  const webDist = existsSync(path.join(webDistCandidate, 'index.html')) ? webDistCandidate : undefined;
  const app = createApp({
    clientOrigin: env.CLIENT_ORIGIN,
    adminToken: env.ADMIN_TOKEN,
    webDist,
    origin: env.CLIENT_ORIGIN,
  });
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

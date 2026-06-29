import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

async function main() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const app = createApp({ clientOrigin: env.CLIENT_ORIGIN });
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

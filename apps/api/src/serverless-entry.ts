// Bundled by esbuild into dist/serverless.mjs (see apps/api/vercel.json buildCommand),
// then re-exported by api/index.ts as the Vercel serverless function.
import type { IncomingMessage, ServerResponse } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

const env = loadEnv(process.env);

// Reuse the Mongoose connection across warm invocations.
let ready: Promise<unknown> | null = null;
function ensureDb(): Promise<unknown> {
  ready ??= mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  return ready;
}

const app = createApp({ clientOrigin: env.CLIENT_ORIGIN, origin: env.CLIENT_ORIGIN });

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ensureDb();
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

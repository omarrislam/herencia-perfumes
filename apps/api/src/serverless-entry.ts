// Bundled by esbuild into dist/serverless.mjs (see apps/api/vercel.json buildCommand),
// then re-exported by api/index.ts as the Vercel serverless function.
import type { IncomingMessage, ServerResponse } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { ensureSampleProduct } from './lib/ensureSampleProduct';

const env = loadEnv(process.env);

// Reuse the Mongoose connection across warm invocations.
let ready: Promise<unknown> | null = null;
function ensureDb(): Promise<unknown> {
  ready ??= mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).then(() => ensureSampleProduct());
  return ready;
}

const app = createApp({ clientOrigin: env.CLIENT_ORIGIN, origin: env.CLIENT_ORIGIN });

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Don't let a DB outage crash the function — otherwise Express never runs and
  // even CORS/preflight headers are missing. Let the app respond (routes that
  // need the DB will return a clean 5xx *with* CORS headers).
  try {
    await ensureDb();
  } catch (err) {
    console.error('[api] Mongo connection failed:', err instanceof Error ? err.message : err);
  }
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

// Vercel serverless entry — wraps the Express app as a single function.
// All routes are rewritten to this handler (see apps/api/vercel.json).
import type { IncomingMessage, ServerResponse } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';

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

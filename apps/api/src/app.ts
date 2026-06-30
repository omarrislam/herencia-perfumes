import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/error';
import { catalogRouter } from './routes/catalog';
import { settingsRouter } from './routes/settings';
import { adminRouter } from './routes/admin';

export function createApp(opts: { clientOrigin: string; adminToken?: string }): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: opts.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', catalogRouter);
  app.use('/api', settingsRouter);
  app.use('/api/admin', adminRouter({ adminToken: opts.adminToken ?? 'test-admin-token-1234' }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

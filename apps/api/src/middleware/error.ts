import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
    public details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Not found', code: 'not_found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    const body: Record<string, unknown> = { message: err.message, code: err.code };
    if (err.details !== undefined) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }

  // Mongoose CastError — malformed ObjectId in route param → 400
  if (err instanceof Error && err.name === 'CastError') {
    return res.status(400).json({ error: { message: 'Invalid id', code: 'invalid_id' } });
  }

  // MongoDB duplicate-key — unique-index violation → 409
  if ((err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: { message: 'Duplicate value', code: 'conflict' } });
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'internal' } });
}

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/** Wraps async route/middleware handlers so rejections reach the global handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** 404 for unknown /api routes (and anything else). */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Normalize Zod failures thrown via asyncHandler
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed.',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    const body: { message: string; errors?: unknown } = { message: err.message };
    if (err instanceof AppError && 'errors' in err && (err as { errors?: unknown }).errors !== undefined) {
      body.errors = (err as { errors?: unknown }).errors;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  console.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Never leak internals in production
  const message = env.NODE_ENV === 'production' ? 'Internal server error.' : err.message;
  res.status(500).json({ message });
}

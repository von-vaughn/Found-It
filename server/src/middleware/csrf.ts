import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // 1. Verify custom client header
  const customHeader = req.headers['x-requested-with'] || req.headers['x-foundit-client'];
  if (!customHeader) {
    res.status(403).json({ message: 'CSRF validation failed: missing custom client header.' });
    return;
  }

  // 2. Verify Origin / Referer. Both are untrusted strings: a malformed value
  // (or the literal "null" that sandboxed iframes send) must not throw a 500.
  let origin = req.headers.origin ?? null;
  if (origin === 'null') {
    origin = null;
  } else if (origin) {
    try {
      new URL(origin);
    } catch {
      origin = null;
    }
  }
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {
      origin = null; // malformed Referer is treated like a missing one
    }
  }

  if (!origin) {
    // In production, reject completely if Origin/Referer is missing
    if (env.NODE_ENV === 'production') {
      res.status(403).json({ message: 'CSRF validation failed: missing origin.' });
      return;
    }
    // In dev mode, if custom header is present, allow tools like cURL/Postman
    return next();
  }

  const originUrl = new URL(origin);
  const isDevLocalhost =
    env.NODE_ENV !== 'production' &&
    (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1');

  const isAllowed =
    isDevLocalhost ||
    env.ALLOWED_ORIGINS.includes(origin) ||
    env.ALLOWED_ORIGINS.includes(originUrl.origin);

  if (!isAllowed) {
    res.status(403).json({ message: 'CSRF validation failed: unauthorized origin.' });
    return;
  }

  next();
}

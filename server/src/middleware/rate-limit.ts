import { rateLimit } from 'express-rate-limit';

/** General API protection: 300 req / 15 min per IP (in-memory; use Redis in prod). */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

/**
 * Brute-force protection for login/register/refresh.
 * Only failed attempts count (skipSuccessfulRequests), so normal dev isn't locked out.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many auth attempts, please try again later.' },
});

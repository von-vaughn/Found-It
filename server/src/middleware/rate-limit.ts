import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';

function isAuthenticatedRequest(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  try {
    verifyAccessToken(header.slice(7));
    return true;
  } catch {
    return false;
  }
}

/** General API protection for unauthenticated/IP traffic; signed-in requests with a verified JWT and /api/auth/* are not counted here. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 2000 : 10000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req: Request) =>
    // Auth endpoints manage their own dedicated limiters; verified signed-in sessions skip the IP quota.
    (req.baseUrl === '/api' && req.path.startsWith('/auth')) ||
    isAuthenticatedRequest(req),
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

export const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many OTP resend requests from this IP. Please try again later.' },
});

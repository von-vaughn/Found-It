import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { findUserById } from '../repositories/user.repository';

/**
 * Verifies the Bearer access token and attaches the payload to req.user.
 * Also rejects deactivated accounts.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or malformed Authorization header. Use Bearer <token>.' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ message: 'User no longer exists.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
      return;
    }
    if (!user.isVerified) {
      res.status(403).json({ message: 'Email not verified. Enter the 6-digit code sent to your inbox.' });
      return;
    }
    req.user = { ...payload, role: user.role }; // always use fresh role from DB
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token.' });
  }
}

/**
 * Like `authenticate`, but does NOT reject unauthenticated requests.
 * If a valid Bearer token is present, req.user is populated as usual;
 * otherwise req.user stays undefined and the request proceeds as a guest.
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (user && user.isActive && user.isVerified) {
      req.user = { ...payload, role: user.role };
    }
  } catch {
    // Invalid token — proceed as guest
  }
  next();
}

import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload, Role } from '../types/roles';

function toSignOptions(expiresIn: string): SignOptions {
  // jsonwebtoken v9 types expect ms.StringValue | number; env provides string
  return { expiresIn: expiresIn as SignOptions['expiresIn'] };
}

export function signAccessToken(user: { id: string; email: string; role: Role }): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, toSignOptions(env.JWT_ACCESS_EXPIRES_IN));
}

export function signRefreshToken(user: { id: string; email: string; role: Role }): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, toSignOptions(env.JWT_REFRESH_EXPIRES_IN));
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  if (decoded.type !== 'access') throw new Error('Not an access token');
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  if (decoded.type !== 'refresh') throw new Error('Not a refresh token');
  return decoded;
}

/** SHA-256 hash used to store refresh tokens without storing the raw JWT. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Refresh-token expiry date derived from env (supports e.g. "7d", "12h", "30m"). */
export function refreshExpiryDate(): Date {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)\s*([smhd])$/.exec(raw.trim());
  const now = Date.now();
  if (!match) return new Date(now + 7 * 24 * 3600 * 1000);
  const value = Number(match[1]);
  const unit = match[2];
  const ms = unit === 's' ? value * 1000
    : unit === 'm' ? value * 60 * 1000
    : unit === 'h' ? value * 3600 * 1000
    : value * 24 * 3600 * 1000;
  return new Date(now + ms);
}

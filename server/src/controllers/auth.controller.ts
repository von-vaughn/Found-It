import type { Request, Response } from 'express';
import { z } from 'zod';
import { createUser, findUserByEmail, findUserById, updateUserPassword } from '../repositories/user.repository';
import {
  findValidRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  storeRefreshToken,
} from '../repositories/refresh-token.repository';
import { comparePassword, hashPassword } from '../utils/password';
import { refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: 'Validation failed',
    errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}

async function issueTokens(user: { id: string; email: string; role: 'user' | 'admin' | 'super_admin' }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken(user.id, refreshToken, refreshExpiryDate());
  return { accessToken, refreshToken };
}

/** POST /api/auth/register — public. Always creates a `user` (never admin). */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ message: 'Email is already registered.' });
    return;
  }

  const user = await createUser({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'user', // role escalation only via super_admin
  });
  const tokens = await issueTokens(user);
  res.status(201).json({ message: 'Registered successfully.', user, ...tokens });
}

/** POST /api/auth/login — public */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
    return;
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const { passwordHash: _omit, ...safe } = user;
  const tokens = await issueTokens(safe);
  res.json({ message: 'Logged in successfully.', user: safe, ...tokens });
}

/** POST /api/auth/refresh — public (rotates refresh token) */
export async function refresh(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);
    const stored = await findValidRefreshToken(parsed.data.refreshToken);
    if (!stored || stored.userId !== payload.sub) {
      res.status(401).json({ message: 'Invalid or expired refresh token.' });
      return;
    }
    const user = await findUserById(payload.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'User no longer available.' });
      return;
    }
    // rotate
    await revokeRefreshToken(parsed.data.refreshToken);
    const { passwordHash: _omit, ...safe } = user;
    const tokens = await issueTokens(safe);
    res.json({ ...tokens });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
}

/** POST /api/auth/logout — revokes the given refresh token */
export async function logout(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    // Allow logout without token (client-side cleanup)
    res.json({ message: 'Logged out.' });
    return;
  }
  await revokeRefreshToken(parsed.data.refreshToken);
  res.json({ message: 'Logged out.' });
}

/** POST /api/auth/logout-all — authenticated, revokes all sessions */
export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  await revokeAllUserTokens(req.user.sub);
  res.json({ message: 'Logged out from all devices.' });
}

/** GET /api/auth/me — authenticated */
export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  const user = await findUserById(req.user.sub);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const { passwordHash: _omit, ...safe } = user;
  res.json({ user: safe });
}

/** PATCH /api/auth/change-password — authenticated */
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const user = await findUserById(req.user.sub);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const ok = await comparePassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    res.status(400).json({ message: 'Current password is incorrect.' });
    return;
  }
  await updateUserPassword(user.id, await hashPassword(parsed.data.newPassword));
  await revokeAllUserTokens(user.id); // force re-login on other devices
  res.json({ message: 'Password changed. Please log in again on other devices.' });
}

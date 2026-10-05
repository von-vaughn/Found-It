import type { Request, Response } from 'express';
import { z } from 'zod';
import { createUser, findUserByEmail, findUserById, setUserVerified, updateUserPassword } from '../repositories/user.repository';
import {
  findValidRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  storeRefreshToken,
} from '../repositories/refresh-token.repository';
import {
  checkOtp,
  generateOtp,
  isResendCoolingDown,
  otpExpiryDate,
  storeOtp,
} from '../repositories/email-otp.repository';
import { comparePassword, hashPassword } from '../utils/password';
import { refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendOtpEmail } from '../utils/mailer';

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

const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: 'Validation failed',
    errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}

async function issueTokens(user: { id: string; email: string; role: 'school_user' | 'admin' | 'super_admin' }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken(user.id, refreshToken, refreshExpiryDate());
  return { accessToken, refreshToken };
}

/** POST /api/auth/register — public. Always creates a `school_user` (never admin). Sends a 6-digit OTP; no tokens until verified. */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    if (!existing.isVerified) {
      // Already registered but unverified — (re)send a code without leaking state.
      if (await isResendCoolingDown(existing.id)) {
        res.status(429).json({ message: 'A code was just sent. Please wait a minute before trying again.' });
        return;
      }
      const otp = generateOtp();
      await storeOtp(existing.id, otp, otpExpiryDate());
      await sendOtpEmail(existing.email, otp, existing.name);
    }
    res.status(200).json({ message: 'If this email is registered, a verification code was sent.' });
    return;
  }

  const user = await createUser({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'school_user', // role escalation only via super_admin
  });
  const otp = generateOtp();
  await storeOtp(user.id, otp, otpExpiryDate());
  await sendOtpEmail(user.email, otp, user.name);
  res.status(201).json({ message: 'Registered. Enter the 6-digit code sent to your email.', user });
}

/** POST /api/auth/verify-email — public. Verifies the OTP and logs the user in. */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    res.status(400).json({ message: 'Invalid code.' });
    return;
  }
  if (user.isVerified) {
    res.status(200).json({ message: 'Email is already verified. Please log in.' });
    return;
  }
  const check = await checkOtp(user.id, parsed.data.otp);
  if (!check.ok) {
    if (check.reason === 'expired') {
      res.status(400).json({ message: 'Code expired. Request a new one.' });
      return;
    }
    if (check.reason === 'locked') {
      res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
      return;
    }
    res.status(400).json({ message: 'Invalid code.' });
    return;
  }
  const verified = await setUserVerified(user.id);
  const tokens = await issueTokens(verified!);
  res.json({ message: 'Email verified.', user: verified, ...tokens });
}

/** POST /api/auth/resend-otp — public. Sends a fresh OTP (60s cooldown). */
export async function resendOtp(req: Request, res: Response): Promise<void> {
  const parsed = resendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  // Generic reply so attackers can't enumerate registered emails.
  const generic = { message: 'If this email is registered, a verification code was sent.' };
  const user = await findUserByEmail(parsed.data.email);
  if (!user || user.isVerified) {
    res.status(200).json(user?.isVerified ? { message: 'Email is already verified. Please log in.' } : generic);
    return;
  }
  if (await isResendCoolingDown(user.id)) {
    res.status(429).json({ message: 'A code was just sent. Please wait a minute before trying again.' });
    return;
  }
  const otp = generateOtp();
  await storeOtp(user.id, otp, otpExpiryDate());
  await sendOtpEmail(user.email, otp, user.name);
  res.status(200).json(generic);
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
  if (!user.isVerified) {
    res.status(403).json({ message: 'Email not verified. Enter the 6-digit code sent to your inbox.' });
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

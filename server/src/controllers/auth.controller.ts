import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import type { SafeUser } from '../types/roles';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserWithHashByEmail,
  formatSuspensionMessage,
  isUserSuspended,
  markUserTutorialSeen,
  setUserVerified,
  updateUserPassword,
} from '../repositories/user.repository';
import {
  findRefreshTokenRecord,
  revokeAllUserTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  storeRefreshToken,
} from '../repositories/refresh-token.repository';
import {
  checkOtp,
  checkResendEligibility,
  generateOtp,
  otpExpiryDate,
  storeOtp,
  type OtpPurpose,
} from '../repositories/email-otp.repository';
import { comparePassword, dummyComparePassword, hashPassword } from '../utils/password';
import { refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendOtpEmail, sendPasswordResetOtpEmail } from '../utils/mailer';

function isStrictSchoolEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[1] === 'wmsu.edu.ph';
}

// first_name/last_name are VARCHAR(50) in the schema; reject before Postgres does.
const NAME_PART_MAX = 50;
const EMAIL_MAX = 255;
const GENERIC_OTP_RESPONSE = { message: 'If this email is eligible, a verification code was sent.' };
const GENERIC_RESET_RESPONSE = {
  message: 'If an eligible account exists for this email, a password reset code has been sent.',
};
const GENERIC_OTP_ERROR = 'Invalid code or code expired.';

function nameFitsColumns(name: string): boolean {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(' ') || firstName;
  return firstName.length <= NAME_PART_MAX && lastName.length <= NAME_PART_MAX;
}

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 bytes')
  .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 bytes',
  });

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100)
      .refine(nameFitsColumns, {
        message: `Each part of your name must be at most ${NAME_PART_MAX} characters`,
      }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(EMAIL_MAX, 'Email address is too long')
      .refine(isStrictSchoolEmail, { message: 'Registration is restricted to @wmsu.edu.ph school emails' }),
    schoolId: z
      .string()
      .trim()
      .min(3, 'School ID must be at least 3 characters')
      .max(30, 'School ID must be at most 30 characters')
      .regex(/^[A-Za-z0-9-]+$/, 'School ID may only contain letters, numbers, and hyphens'),
    password: passwordSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required').max(72, 'Password cannot exceed 72 bytes'),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  })
  .strict();

const resendOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(EMAIL_MAX, 'Email address is too long'),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    newPassword: passwordSchema,
  })
  .strict();

const checkEmailSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(EMAIL_MAX, 'Email address is too long')
      .refine(isStrictSchoolEmail, { message: 'Registration is restricted to @wmsu.edu.ph school emails' }),
  })
  .strict();

function zodError(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    message: 'Validation failed',
    errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // Note: domain is intentionally left UNSET so the cookie is host-only.
};

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, COOKIE_OPTIONS);
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    path: '/api/auth',
  });
}

/** Fire-and-forget OTP dispatch: a mail failure is logged, never an unhandled rejection. */
function dispatchOtpEmail(
  email: string,
  otp: string,
  name: string,
  purpose: OtpPurpose = 'verify_email',
): void {
  const send = purpose === 'reset_password' ? sendPasswordResetOtpEmail : sendOtpEmail;
  void send(email, otp, name).catch((err) => {
    console.error('Failed to send OTP email:', err);
  });
}

/**
 * POST /api/auth/check-email (also accepts GET with ?email=) — public.
 * Checks whether an email is already registered within the system.
 */
export async function checkEmail(req: Request, res: Response): Promise<void> {
  const rawEmail = req.method === 'GET' ? req.query.email : req.body?.email;
  const parsed = checkEmailSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { email } = parsed.data;
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({
      available: false,
      message: 'An account with this email already exists.',
    });
    return;
  }
  res.status(200).json({
    available: true,
    message: 'Email is available.',
  });
}

/**
 * POST /api/auth/register — public.
 * Registers a new school user. Duplicate emails already existing in the system are rejected.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { name, email, schoolId, password } = parsed.data;

  // Duplicate email check: duplicate emails already existing within the system are strictly not allowed
  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ message: 'An account with this email already exists.' });
    return;
  }

  const [firstNameRaw, ...restRaw] = name.trim().split(/\s+/);
  const firstName = firstNameRaw;
  const lastName = restRaw.join(' ') || firstName;

  const passwordHash = await hashPassword(password);

  let user: SafeUser;
  try {
    user = await createUser({
      firstName,
      lastName,
      email,
      schoolId,
      passwordHash,
      role: 'school_user',
      isVerified: false,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }

  const otp = generateOtp();
  await storeOtp(user.id, otp, otpExpiryDate());
  void dispatchOtpEmail(user.email, otp, user.name);

  res.status(200).json(GENERIC_OTP_RESPONSE);
}

/** POST /api/auth/verify-email — public. Verifies OTP and issues host-only cookie. */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const user = await findUserByEmail(parsed.data.email);
  // Unknown, already-verified, and bad-code cases are indistinguishable on purpose:
  // this endpoint is public, so any status difference enumerates the account list.
  if (!user || user.isVerified) {
    res.status(400).json({ message: GENERIC_OTP_ERROR });
    return;
  }

  const check = await checkOtp(user.id, parsed.data.otp);
  if (!check.ok) {
    if (check.reason === 'locked') {
      res.status(429).json({ message: 'Verification locked due to too many failed attempts. Try again in an hour.' });
      return;
    }
    res.status(400).json({ message: GENERIC_OTP_ERROR });
    return;
  }

  const verified = await setUserVerified(user.id);
  if (!verified) {
    res.status(500).json({ message: 'Failed to complete verification.' });
    return;
  }

  const accessToken = signAccessToken(verified);
  const refreshToken = signRefreshToken(verified);
  await storeRefreshToken(verified.id, refreshToken, refreshExpiryDate());
  setRefreshTokenCookie(res, refreshToken);

  res.json({ message: 'Email verified successfully.', user: verified, accessToken });
}

/** POST /api/auth/resend-otp — public. Rate-limited and cooldown protected. */
export async function resendOtp(req: Request, res: Response): Promise<void> {
  const parsed = resendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  // Always the same 200 body: a 429 here would tell an attacker that the address
  // exists and is unverified. Cooldowns are enforced by silently not sending.
  const user = await findUserByEmail(parsed.data.email);
  if (user && !user.isVerified) {
    const eligibility = await checkResendEligibility(user.id);
    if (eligibility.allowed) {
      const otp = generateOtp();
      await storeOtp(user.id, otp, otpExpiryDate());
      void dispatchOtpEmail(user.email, otp, user.name);
    }
  }

  res.status(200).json(GENERIC_OTP_RESPONSE);
}

/** POST /api/auth/forgot-password — public. Sends a rate-limited reset OTP without enumerating emails. */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }

  const user = await findUserByEmail(parsed.data.email);
  if (user && user.isActive && user.isVerified && !isUserSuspended(user)) {
    const eligibility = await checkResendEligibility(user.id);
    if (eligibility.allowed) {
      const otp = generateOtp();
      await storeOtp(user.id, otp, otpExpiryDate(), 'reset_password');
      void dispatchOtpEmail(user.email, otp, user.name, 'reset_password');
    }
  }

  res.status(200).json(GENERIC_RESET_RESPONSE);
}

/** POST /api/auth/reset-password — public. Verifies reset OTP, updates password, and revokes sessions. */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !user.isActive || !user.isVerified || isUserSuspended(user)) {
    res.status(400).json({ message: GENERIC_OTP_ERROR });
    return;
  }

  const check = await checkOtp(user.id, parsed.data.otp, 'reset_password');
  if (!check.ok) {
    if (check.reason === 'locked') {
      res.status(429).json({ message: 'Too many failed attempts. Try again in an hour.' });
      return;
    }
    res.status(400).json({ message: GENERIC_OTP_ERROR });
    return;
  }

  await updateUserPassword(user.id, await hashPassword(parsed.data.newPassword));
  await revokeAllUserTokens(user.id);
  clearRefreshTokenCookie(res);

  res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
}

/** POST /api/auth/login — public. Progressive throttling and timing-safe dummy comparisons. */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { email, password } = parsed.data;

  const user = await findUserWithHashByEmail(email);

  if (!user) {
    await dummyComparePassword(password);
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
    return;
  }
  if (isUserSuspended(user)) {
    res.status(403).json({ message: formatSuspensionMessage(user) });
    return;
  }

  // Reveal unverified status ONLY after credentials pass
  if (!user.isVerified) {
    // Automatically trigger a rate-limited OTP dispatch so a fresh code is sent
    const eligibility = await checkResendEligibility(user.id);
    if (eligibility.allowed) {
      const otp = generateOtp();
      await storeOtp(user.id, otp, otpExpiryDate());
      void dispatchOtpEmail(user.email, otp, user.name);
      res.status(403).json({ message: 'Email not verified. Enter the 6-digit code sent to your inbox.' });
      return;
    }
    res.status(403).json({
      message: 'Email not verified. Enter your recent 6-digit code, or wait before requesting a new one.',
    });
    return;
  }

  const { passwordHash: _omit, ...safe } = user;
  const accessToken = signAccessToken(safe);
  const refreshToken = signRefreshToken(safe);
  await storeRefreshToken(safe.id, refreshToken, refreshExpiryDate());
  setRefreshTokenCookie(res, refreshToken);

  res.json({
    message: 'Logged in successfully.',
    user: safe,
    accessToken,
  });
}

/** POST /api/auth/refresh — Cookie-only with Web Locks / 25s rotation grace window */
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ message: 'Refresh token cookie missing.' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const record = await findRefreshTokenRecord(token);

    if (!record) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'Invalid refresh token.' });
      return;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'Invalid or expired refresh token.' });
      return;
    }

    if (record.revoked) {
      // Grace window check: if rotated within 25 seconds, allow concurrent tab without penalizing
      if (
        record.revokedReason === 'rotated' &&
        record.revokedAt &&
        Date.now() - record.revokedAt.getTime() < 25000
      ) {
        const user = await findUserById(record.userId);
        if (!user || !user.isVerified) {
          clearRefreshTokenCookie(res);
          res.status(401).json({ message: 'User session is not valid.' });
          return;
        }
        if (!user.isActive) {
          clearRefreshTokenCookie(res);
          res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
          return;
        }
        if (isUserSuspended(user)) {
          clearRefreshTokenCookie(res);
          res.status(403).json({ message: formatSuspensionMessage(user) });
          return;
        }
        const accessToken = signAccessToken(user);
        res.json({ user, accessToken });
        return;
      }

      // Replay outside grace window triggers token theft revocation
      if (record.revokedReason === 'rotated') {
        await revokeAllUserTokens(record.userId);
        clearRefreshTokenCookie(res);
        res.status(401).json({ message: 'Session invalidated due to concurrent reuse. Please sign in again.' });
        return;
      }

      // Single device logout
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'Session logged out.' });
      return;
    }

    const user = await findUserById(payload.sub);
    if (!user || !user.isVerified) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'User session is not valid.' });
      return;
    }
    if (!user.isActive) {
      clearRefreshTokenCookie(res);
      res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
      return;
    }
    if (isUserSuspended(user)) {
      clearRefreshTokenCookie(res);
      res.status(403).json({ message: formatSuspensionMessage(user) });
      return;
    }

    // Normal rotation
    const newRefreshToken = signRefreshToken(user);
    await rotateRefreshToken(token, newRefreshToken, user.id, refreshExpiryDate());
    setRefreshTokenCookie(res, newRefreshToken);

    const accessToken = signAccessToken(user);
    res.json({ user, accessToken });
  } catch (err) {
    console.error('Refresh failed:', err);
    clearRefreshTokenCookie(res);
    res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
}

/** POST /api/auth/logout — Cookie-only */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) {
    await revokeRefreshToken(token, 'logout');
  }
  clearRefreshTokenCookie(res);
  res.json({ message: 'Logged out.' });
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
  res.json({ user });
}

/** PATCH /api/auth/tutorial-seen — marks the guided tour as completed for the user */
export async function markTutorialSeen(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  await markUserTutorialSeen(req.user.sub);
  res.json({ hasSeenTutorial: true });
}

const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required.').max(72),
});

/** POST /api/auth/verify-password — authenticated admin password confirmation. */
export async function verifyAdminPassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  const parsed = verifyPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const user = await findUserWithHashByEmail(req.user.email);
  if (!user || !user.isActive) {
    res.status(401).json({ message: 'User not found.' });
    return;
  }
  const ok = await comparePassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(403).json({ message: 'Incorrect password.' });
    return;
  }
  res.json({ verified: true });
}

import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserWithHashByEmail,
  recordFailedLogin,
  resetFailedLogin,
  setUserVerified,
  updateUserPassword,
  updateUserRegistration,
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
} from '../repositories/email-otp.repository';
import { comparePassword, dummyComparePassword, hashPassword } from '../utils/password';
import { refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendOtpEmail } from '../utils/mailer';

function isStrictSchoolEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[1] === 'wmsu.edu.ph';
}

// first_name/last_name are VARCHAR(50) in the schema; reject before Postgres does.
const NAME_PART_MAX = 50;
const EMAIL_MAX = 255;
const GENERIC_OTP_RESPONSE = { message: 'If this email is eligible, a verification code was sent.' };
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
    password: passwordSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required').max(72, 'Password cannot exceed 72 bytes'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'currentPassword is required').max(72),
    newPassword: passwordSchema,
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
function dispatchOtpEmail(email: string, otp: string, name: string): void {
  void sendOtpEmail(email, otp, name).catch((err) => {
    console.error('Failed to send OTP email:', err);
  });
}

/**
 * POST /api/auth/register — public.
 * Non-enumerable: hashes password for all branches and always returns HTTP 200.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    zodError(res, parsed.error);
    return;
  }
  const { name, email, password } = parsed.data;
  const [firstNameRaw, ...restRaw] = name.trim().split(/\s+/);
  const firstName = firstNameRaw;
  const lastName = restRaw.join(' ') || firstName;

  // Constant work: hash password in all execution branches to normalize response timing
  const passwordHash = await hashPassword(password);

  const existing = await findUserByEmail(email);

  if (!existing) {
    // 1. New account registration
    const user = await createUser({
      firstName,
      lastName,
      email,
      passwordHash,
      role: 'school_user',
      isVerified: false,
    });
    const otp = generateOtp();
    await storeOtp(user.id, otp, otpExpiryDate());
    // Asynchronous dispatch (non-blocking)
    void dispatchOtpEmail(user.email, otp, user.name);
  } else if (!existing.isVerified) {
    // 2. Existing unverified account: overwrite credentials to prevent pre-registration hijacking
    await updateUserRegistration(existing.id, {
      firstName,
      lastName,
      passwordHash,
    });
    const eligible = await checkResendEligibility(existing.id);
    if (eligible.allowed) {
      const otp = generateOtp();
      await storeOtp(existing.id, otp, otpExpiryDate());
      void dispatchOtpEmail(existing.email, otp, existing.name);
    }
  } else {
    // 3. Existing verified account: do not leak status; optionally send security alert
    // (no-op or security notification asynchronously)
  }

  // Consistent 200 response across all cases
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

  if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
    res.status(429).json({ message: 'Account is temporarily locked due to failed login attempts. Try again later.' });
    return;
  }

  const passwordOk = await comparePassword(password, user.passwordHash);
  if (!passwordOk) {
    await recordFailedLogin(user.id);
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  await resetFailedLogin(user.id);

  if (!user.isActive) {
    res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
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
    }
    res.status(403).json({ message: 'Email not verified. Enter the 6-digit code sent to your inbox.' });
    return;
  }

  const { passwordHash: _omit, failedLoginAttempts: _fla, loginLockedUntil: _llu, ...safe } = user;
  const accessToken = signAccessToken(safe);
  const refreshToken = signRefreshToken(safe);
  await storeRefreshToken(safe.id, refreshToken, refreshExpiryDate());
  setRefreshTokenCookie(res, refreshToken);

  res.json({
    message: 'Logged in successfully.',
    user: safe,
    accessToken,
    mustChangePassword: safe.mustChangePassword,
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

    if (record.revoked) {
      // Grace window check: if rotated within 25 seconds, allow concurrent tab without penalizing
      if (
        record.revokedReason === 'rotated' &&
        record.revokedAt &&
        Date.now() - record.revokedAt.getTime() < 25000
      ) {
        const user = await findUserById(record.userId);
        if (!user) {
          clearRefreshTokenCookie(res);
          res.status(401).json({ message: 'User no longer exists.' });
          return;
        }
        if (!user.isActive) {
          clearRefreshTokenCookie(res);
          res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
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
    if (!user) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'User no longer exists.' });
      return;
    }
    if (!user.isActive) {
      clearRefreshTokenCookie(res);
      res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
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

/** POST /api/auth/logout-all — authenticated, revokes all user sessions */
export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated.' });
    return;
  }
  await revokeAllUserTokens(req.user.sub);
  clearRefreshTokenCookie(res);
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
  res.json({ user });
}

/** PATCH /api/auth/change-password — authenticated. Revokes all active refresh tokens. */
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
  const user = await findUserWithHashByEmail(req.user.email);
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
  await revokeAllUserTokens(user.id);
  clearRefreshTokenCookie(res);

  res.json({ message: 'Password changed successfully. Please sign in again with your new password.' });
}

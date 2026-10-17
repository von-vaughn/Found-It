import crypto from 'crypto';
import { pool } from '../config/db';
import { env } from '../config/env';

export const OTP_MAX_ATTEMPTS = 5;
export const CUMULATIVE_MAX_ATTEMPTS = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_HOURLY_LIMIT = 3;

/** 6-digit numeric OTP (allows leading zeros). */
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
}

/** HMAC-SHA256 keyed with server OTP_SECRET and bound to userId */
export function hashOtp(userId: string, otp: string): string {
  return crypto
    .createHmac('sha256', env.OTP_SECRET)
    .update(`${userId}:${otp.trim()}`)
    .digest('hex');
}

function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

interface OtpRow {
  id: string;
  user_id: string;
  otp_hash: string;
  expires_at: Date;
  consumed: boolean;
  attempts: number;
  created_at: Date;
}

/** Invalidates older unconsumed OTPs and stores the new HMAC-hashed OTP. */
export async function storeOtp(userId: string, otp: string, expiresAt: Date): Promise<string> {
  await pool.query(
    `UPDATE email_otp SET consumed = TRUE WHERE user_id = $1 AND consumed = FALSE`,
    [userId],
  );
  const { rows } = await pool.query<OtpRow>(
    `INSERT INTO email_otp (user_id, otp_hash, expires_at) VALUES ($1, $2, $3) RETURNING id`,
    [userId, hashOtp(userId, otp), expiresAt],
  );
  return rows[0].id;
}

export async function checkResendEligibility(userId: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  const { rows } = await pool.query<{
    last_resend_at: Date | null;
    resend_count_window: number;
  }>(
    `SELECT last_resend_at, resend_count_window FROM "user" WHERE id = $1`,
    [userId],
  );
  if (!rows[0]) return { allowed: false, message: 'User not found.' };

  const lastResend = rows[0].last_resend_at ? new Date(rows[0].last_resend_at).getTime() : 0;
  const now = Date.now();

  if (now - lastResend < RESEND_COOLDOWN_MS) {
    return {
      allowed: false,
      message: 'A verification code was just sent. Please wait a minute before requesting another.',
    };
  }

  // If last resend was over 1 hour ago, reset the hourly window counter
  if (now - lastResend > 60 * 60 * 1000) {
    await pool.query(
      `UPDATE "user" SET last_resend_at = NOW(), resend_count_window = 1 WHERE id = $1`,
      [userId],
    );
    return { allowed: true };
  }

  if (rows[0].resend_count_window >= RESEND_HOURLY_LIMIT) {
    return {
      allowed: false,
      message: 'Too many verification code requests for this account. Please wait an hour.',
    };
  }

  await pool.query(
    `UPDATE "user" SET last_resend_at = NOW(), resend_count_window = resend_count_window + 1 WHERE id = $1`,
    [userId],
  );
  return { allowed: true };
}

export type OtpCheck =
  | { ok: true; otpId: string }
  | { ok: false; reason: 'expired' | 'invalid' | 'locked' };

/**
 * Validates OTP against latest unconsumed code.
 * Checks per-code attempts (max 5) and cumulative failures (locks for 1h at 15).
 */
export async function checkOtp(userId: string, otp: string): Promise<OtpCheck> {
  // Check cumulative account lockout
  const { rows: userRows } = await pool.query<{
    verification_failed_attempts: number;
    verification_locked_until: Date | null;
  }>(
    `SELECT verification_failed_attempts, verification_locked_until FROM "user" WHERE id = $1`,
    [userId],
  );
  const user = userRows[0];
  if (user?.verification_locked_until) {
    if (new Date(user.verification_locked_until).getTime() > Date.now()) {
      return { ok: false, reason: 'locked' };
    }
    // The lock has served its sentence: clear the slate, otherwise a single
    // wrong guess re-locks the account for another hour.
    await pool.query(
      `UPDATE "user"
       SET verification_failed_attempts = 0, verification_locked_until = NULL
       WHERE id = $1`,
      [userId],
    );
  }

  const { rows } = await pool.query<OtpRow>(
    `SELECT id, user_id, otp_hash, expires_at, attempts
     FROM email_otp
     WHERE user_id = $1 AND consumed = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
    return { ok: false, reason: 'locked' };
  }

  const candidateHash = hashOtp(userId, otp);
  const isMatch = safeCompareHex(candidateHash, row.otp_hash);

  if (!isMatch) {
    // Increment both row attempts and cumulative account failures
    await pool.query(
      `UPDATE email_otp SET attempts = attempts + 1 WHERE id = $1`,
      [row.id],
    );
    const { rows: updatedUser } = await pool.query<{ verification_failed_attempts: number }>(
      `UPDATE "user"
       SET verification_failed_attempts = verification_failed_attempts + 1
       WHERE id = $1
       RETURNING verification_failed_attempts`,
      [userId],
    );

    const cumulative = updatedUser[0]?.verification_failed_attempts ?? 0;
    if (cumulative >= CUMULATIVE_MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE "user" SET verification_locked_until = NOW() + INTERVAL '1 hour' WHERE id = $1`,
        [userId],
      );
      await pool.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
      return { ok: false, reason: 'locked' };
    }

    if (row.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      await pool.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
      return { ok: false, reason: 'locked' };
    }

    return { ok: false, reason: 'invalid' };
  }

  // Single-use: mark consumed and reset failure counters
  await pool.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
  await pool.query(
    `UPDATE "user"
     SET verification_failed_attempts = 0, verification_locked_until = NULL
     WHERE id = $1`,
    [userId],
  );

  return { ok: true, otpId: row.id };
}

export async function purgeOtps(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM email_otp WHERE consumed = TRUE OR expires_at <= NOW()`,
  );
  return rowCount ?? 0;
}

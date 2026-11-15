import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { pool } from '../config/db';
import { env } from '../config/env';

export const OTP_MAX_ATTEMPTS = 5;
export const CUMULATIVE_MAX_ATTEMPTS = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_HOURLY_LIMIT = 3;

export type OtpPurpose = 'verify_email' | 'reset_password';

/** 6-digit numeric OTP (allows leading zeros). */
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
}

/** HMAC-SHA256 keyed with server OTP_SECRET and bound to userId and purpose */
export function hashOtp(
  userId: string,
  otp: string,
  purpose: OtpPurpose = 'verify_email',
): string {
  return crypto
    .createHmac('sha256', env.OTP_SECRET)
    .update(`${userId}:${purpose}:${otp.trim()}`)
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

interface UserOtpState {
  last_resend_at: Date | null;
  resend_count_window: number;
  verification_failed_attempts: number;
  verification_locked_until: Date | null;
}

/** Runs an OTP operation under a per-user row lock so concurrent requests cannot race. */
async function withUserOtpLock<T>(
  userId: string,
  fn: (client: PoolClient, user: UserOtpState | undefined) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<UserOtpState>(
      `SELECT last_resend_at, resend_count_window, verification_failed_attempts, verification_locked_until
       FROM "user" WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    const result = await fn(client, rows[0]);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Invalidates older unconsumed OTPs for this purpose, stores the new HMAC-hashed OTP, and anchors cooldown. */
export async function storeOtp(
  userId: string,
  otp: string,
  expiresAt: Date,
  purpose: OtpPurpose = 'verify_email',
): Promise<string> {
  return withUserOtpLock(userId, async (client) => {
    await client.query(
      `UPDATE email_otp SET consumed = TRUE WHERE user_id = $1 AND purpose = $2 AND consumed = FALSE`,
      [userId, purpose],
    );
    const { rows } = await client.query<OtpRow>(
      `INSERT INTO email_otp (user_id, otp_hash, expires_at, purpose) VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, hashOtp(userId, otp, purpose), expiresAt, purpose],
    );
    await client.query(`UPDATE "user" SET last_resend_at = NOW() WHERE id = $1`, [userId]);
    return rows[0].id;
  });
}

export async function checkResendEligibility(userId: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  return withUserOtpLock(userId, async (client, user) => {
    if (!user) return { allowed: false, message: 'User not found.' };

    const lastResend = user.last_resend_at ? new Date(user.last_resend_at).getTime() : 0;
    const now = Date.now();

    if (now - lastResend < RESEND_COOLDOWN_MS) {
      return {
        allowed: false,
        message: 'A verification code was just sent. Please wait a minute before requesting another.',
      };
    }

    // If last resend was over 1 hour ago, reset the hourly window counter
    if (now - lastResend > 60 * 60 * 1000) {
      await client.query(
        `UPDATE "user" SET last_resend_at = NOW(), resend_count_window = 1 WHERE id = $1`,
        [userId],
      );
      return { allowed: true };
    }

    if (user.resend_count_window >= RESEND_HOURLY_LIMIT) {
      return {
        allowed: false,
        message: 'Too many verification code requests for this account. Please wait an hour.',
      };
    }

    await client.query(
      `UPDATE "user" SET last_resend_at = NOW(), resend_count_window = resend_count_window + 1 WHERE id = $1`,
      [userId],
    );
    return { allowed: true };
  });
}

export type OtpCheck =
  | { ok: true; otpId: string }
  | { ok: false; reason: 'expired' | 'invalid' | 'locked' };

/**
 * Validates OTP against latest unconsumed code for the given purpose.
 * Exhausts single code at 5 failures ('expired'); locks account for 1h only at 15 cumulative failures.
 */
export async function checkOtp(
  userId: string,
  otp: string,
  purpose: OtpPurpose = 'verify_email',
): Promise<OtpCheck> {
  return withUserOtpLock(userId, async (client, user) => {
    if (!user) return { ok: false, reason: 'expired' };

    if (user.verification_locked_until) {
      if (new Date(user.verification_locked_until).getTime() > Date.now()) {
        return { ok: false, reason: 'locked' };
      }
      // Reset expired lockout before checking attempts.
      await client.query(
        `UPDATE "user"
         SET verification_failed_attempts = 0, verification_locked_until = NULL
         WHERE id = $1`,
        [userId],
      );
    }

    const { rows } = await client.query<OtpRow>(
      `SELECT id, user_id, otp_hash, expires_at, attempts
       FROM email_otp
       WHERE user_id = $1 AND purpose = $2 AND consumed = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [userId, purpose],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await client.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
      return { ok: false, reason: 'expired' };
    }

    const candidateHash = hashOtp(userId, otp, purpose);
    const isMatch = safeCompareHex(candidateHash, row.otp_hash);

    if (!isMatch) {
      await client.query(
        `UPDATE email_otp SET attempts = attempts + 1 WHERE id = $1`,
        [row.id],
      );
      const { rows: updatedUser } = await client.query<{ verification_failed_attempts: number }>(
        `UPDATE "user"
         SET verification_failed_attempts = verification_failed_attempts + 1
         WHERE id = $1
         RETURNING verification_failed_attempts`,
        [userId],
      );

      const cumulative = updatedUser[0]?.verification_failed_attempts ?? 0;
      if (cumulative >= CUMULATIVE_MAX_ATTEMPTS) {
        await client.query(
          `UPDATE "user" SET verification_locked_until = NOW() + INTERVAL '1 hour' WHERE id = $1`,
          [userId],
        );
        await client.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
        return { ok: false, reason: 'locked' };
      }

      if (row.attempts + 1 >= OTP_MAX_ATTEMPTS) {
        await client.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
        return { ok: false, reason: 'expired' };
      }

      return { ok: false, reason: 'invalid' };
    }

    // Single-use: mark consumed and reset failure counters
    await client.query(`UPDATE email_otp SET consumed = TRUE WHERE id = $1`, [row.id]);
    await client.query(
      `UPDATE "user"
       SET verification_failed_attempts = 0, verification_locked_until = NULL
       WHERE id = $1`,
      [userId],
    );

    return { ok: true, otpId: row.id };
  });
}

export async function purgeOtps(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM email_otp WHERE consumed = TRUE OR expires_at <= NOW()`,
  );
  return rowCount ?? 0;
}

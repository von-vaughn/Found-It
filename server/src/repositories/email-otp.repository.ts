import crypto from 'crypto';
import { pool } from '../config/db';
import { env } from '../config/env';
import { hashToken } from '../utils/jwt';

export const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

/** 6-digit numeric OTP (allows leading zeros). */
export function generateOtp(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
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

/** Invalidates older unconsumed OTPs and stores the new one. Returns the row id. */
export async function storeOtp(userId: string, otp: string, expiresAt: Date): Promise<string> {
  await pool.query(`UPDATE email_otps SET consumed = TRUE WHERE user_id = $1 AND consumed = FALSE`, [
    userId,
  ]);
  const { rows } = await pool.query<OtpRow>(
    `INSERT INTO email_otps (user_id, otp_hash, expires_at) VALUES ($1, $2, $3) RETURNING id`,
    [userId, hashToken(otp), expiresAt],
  );
  return rows[0].id;
}

/** Latest unconsumed OTP for cooldown checks (null if none). */
export async function latestOtpCreatedAt(userId: string): Promise<Date | null> {
  const { rows } = await pool.query<{ created_at: Date }>(
    `SELECT created_at FROM email_otps WHERE user_id = $1 AND consumed = FALSE ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? new Date(rows[0].created_at) : null;
}

export async function isResendCoolingDown(userId: string): Promise<boolean> {
  const latest = await latestOtpCreatedAt(userId);
  return latest !== null && Date.now() - latest.getTime() < RESEND_COOLDOWN_MS;
}

export type OtpCheck = { ok: true; otpId: string } | { ok: false; reason: 'expired' | 'invalid' | 'locked' };

/**
 * Checks the OTP against the latest unconsumed, unexpired code.
 * Wrong attempts increment; at OTP_MAX_ATTEMPTS the code is locked (consumed).
 * A correct code is marked consumed (single-use).
 */
export async function checkOtp(userId: string, otp: string): Promise<OtpCheck> {
  const { rows } = await pool.query<OtpRow>(
    `SELECT * FROM email_otps WHERE user_id = $1 AND consumed = FALSE ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query(`UPDATE email_otps SET consumed = TRUE WHERE id = $1`, [row.id]);
    return { ok: false, reason: 'locked' };
  }
  if (hashToken(otp.trim()) !== row.otp_hash) {
    const { rows: updated } = await pool.query<{ attempts: number }>(
      `UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
      [row.id],
    );
    if ((updated[0]?.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await pool.query(`UPDATE email_otps SET consumed = TRUE WHERE id = $1`, [row.id]);
      return { ok: false, reason: 'locked' };
    }
    return { ok: false, reason: 'invalid' };
  }
  await pool.query(`UPDATE email_otps SET consumed = TRUE WHERE id = $1`, [row.id]);
  return { ok: true, otpId: row.id };
}

/** Cleanup helper — removes consumed/expired codes. */
export async function purgeOtps(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM email_otps WHERE consumed = TRUE OR expires_at <= NOW()`,
  );
  return rowCount ?? 0;
}

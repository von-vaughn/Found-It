import { pool } from '../config/db';
import { hashToken } from '../utils/jwt';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  revoked: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  expiresAt: Date;
}

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_token (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(refreshToken), expiresAt],
  );
}

export async function findRefreshTokenRecord(
  refreshToken: string,
): Promise<RefreshTokenRecord | null> {
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    revoked: boolean;
    revoked_at: Date | null;
    revoked_reason: string | null;
    expires_at: Date;
  }>(
    `SELECT id, user_id, revoked, revoked_at, revoked_reason, expires_at
     FROM refresh_token
     WHERE token_hash = $1
     LIMIT 1`,
    [hashToken(refreshToken)],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    revoked: rows[0].revoked,
    revokedAt: rows[0].revoked_at ? new Date(rows[0].revoked_at) : null,
    revokedReason: rows[0].revoked_reason,
    expiresAt: new Date(rows[0].expires_at),
  };
}

export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE refresh_token
       SET revoked = TRUE, revoked_at = NOW(), revoked_reason = 'rotated'
       WHERE token_hash = $1`,
      [hashToken(oldToken)],
    );
    await client.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, hashToken(newToken), expiresAt],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeRefreshToken(
  refreshToken: string,
  reason: 'logout' | 'rotated' | 'theft' = 'logout',
): Promise<void> {
  await pool.query(
    `UPDATE refresh_token
     SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $2
     WHERE token_hash = $1`,
    [hashToken(refreshToken), reason],
  );
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await pool.query(
    `UPDATE refresh_token
     SET revoked = TRUE, revoked_at = NOW(), revoked_reason = 'revoked_all'
     WHERE user_id = $1`,
    [userId],
  );
}

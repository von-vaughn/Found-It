import { pool } from '../config/db';
import { hashToken } from '../utils/jwt';

export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(refreshToken), expiresAt],
  );
}

export async function findValidRefreshToken(
  refreshToken: string,
): Promise<{ id: string; userId: string } | null> {
  const { rows } = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()
     LIMIT 1`,
    [hashToken(refreshToken)],
  );
  return rows[0] ? { id: rows[0].id, userId: rows[0].user_id } : null;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, [
    hashToken(refreshToken),
  ]);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
}

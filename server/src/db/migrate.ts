import { pool } from "../config/db";

/**
 * Minimal code-first migration for PostgreSQL.
 * Creates the `users`, `refresh_tokens`, and `items` tables if they don't exist.
 */
export async function migrate(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'school_user'
        CHECK (role IN ('school_user', 'admin', 'super_admin')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_type VARCHAR(10) NOT NULL
        CHECK (report_type IN ('lost', 'found')),
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      item_date DATE NOT NULL,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Role rename: 'user' -> 'school_user' (existing DBs only; fresh tables already use it).
  const { rows: legacyRoleRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM users WHERE role = 'user'`,
  );
  const { rows: roleCheckRows } = await pool.query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
     WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass`,
  );
  const roleDef: string = roleCheckRows[0]?.def ?? '';
  if (legacyRoleRows[0].count > 0 || !roleDef.includes('school_user')) {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await pool.query(`UPDATE users SET role = 'school_user' WHERE role = 'user';`);
    await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'school_user';`);
    await pool.query(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('school_user', 'admin', 'super_admin'));`,
    );
  }

  // Email verification (added after users table existed):
  // backfill-once so accounts created before this feature stay verified.
  const { rows: colRows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'is_verified' LIMIT 1`,
  );
  if (colRows.length === 0) {
    await pool.query(`ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;`);
    await pool.query(`UPDATE users SET is_verified = TRUE;`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed BOOLEAN NOT NULL DEFAULT FALSE,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_reporter_id ON items(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_items_report_type ON items(report_type);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);
  `);
}

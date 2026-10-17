import { pool } from "../config/db";
import { assertMailConfigured } from "../utils/mailer";

/**
 * Code-first schema for PostgreSQL (singular table names) — fresh install.
 * Creates every table/index if missing. No upgrade/alter steps: pre-production,
 * the migration path for schema changes is wipe + re-run.
 */
export async function migrate(): Promise<void> {
  assertMailConfigured();
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'school_user'
        CHECK (role IN ('school_user', 'admin', 'super_admin')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_student BOOLEAN NOT NULL DEFAULT TRUE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_flags_check CHECK (NOT (is_student AND is_admin))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_token (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otp (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed BOOLEAN NOT NULL DEFAULT FALSE,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS building (
      building_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS location (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      building_id UUID NOT NULL REFERENCES building(building_id) ON DELETE CASCADE,
      description TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS category (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL UNIQUE
    );
  `);

  // report is the parent of item: who reported, where, when.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      location_id UUID REFERENCES location(id) ON DELETE RESTRICT,
      report_type VARCHAR(10) NOT NULL
        CHECK (report_type IN ('lost', 'found')),
      date DATE NOT NULL,
      time TIME,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES report(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      primary_color VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS image (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url TEXT NOT NULL,
      item_id UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE
    );
  `);

  // claim/return asks on an item; status tracks the request lifecycle.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS request (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL
        CHECK (kind IN ('claim', 'return')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'claimed', 'returned', 'rejected')),
      evidence TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
    CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
    CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_token(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_otp_user_id ON email_otp(user_id);
    CREATE INDEX IF NOT EXISTS idx_location_building_id ON location(building_id);
    CREATE INDEX IF NOT EXISTS idx_report_user_id ON report(user_id);
    CREATE INDEX IF NOT EXISTS idx_report_location_id ON report(location_id);
    CREATE INDEX IF NOT EXISTS idx_item_report_id ON item(report_id);
    CREATE INDEX IF NOT EXISTS idx_item_category_id ON item(category_id);
    CREATE INDEX IF NOT EXISTS idx_image_item_id ON image(item_id);
    CREATE INDEX IF NOT EXISTS idx_request_item_id ON request(item_id);
    CREATE INDEX IF NOT EXISTS idx_request_user_id ON request(user_id);
  `);

  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_failed_attempts INT NOT NULL DEFAULT 0;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_locked_until TIMESTAMPTZ;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS login_locked_until TIMESTAMPTZ;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_resend_at TIMESTAMPTZ;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS resend_count_window INT NOT NULL DEFAULT 0;

    ALTER TABLE refresh_token ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
    ALTER TABLE refresh_token ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(20);
  `);
}

import { pool } from "../config/db";

/**
 * Code-first migration for PostgreSQL (singular table names).
 *
 * Final shape:
 *   "user", refresh_token, email_otp, building, location,
 *   category, report, item, image, request
 *
 * Runs in two phases so existing deployments upgrade in place:
 *   1. Ensure the legacy plural tables (users, refresh_tokens, items,
 *      email_otps) plus the legacy role/is_verified fixes.
 *   2. Reshape to the singular schema with data backfill
 *      (name -> first_name/last_name, one report per legacy item).
 * Idempotent — safe to run on every boot.
 */
export async function migrate(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  // Singular schema present -> Phase 1 legacy base is obsolete; skip it so
  // re-runs never recreate the dropped plural tables.
  const { rows: singularRows } = await pool.query(
    `SELECT to_regclass('public."user"') AS reg`,
  );
  const singularExists = singularRows[0]?.reg !== null;

  if (!singularExists) {
  // ---- Phase 1: legacy base (unchanged, for in-place upgrades) ----
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
  } // end Phase 1 (skipped when singular schema already exists)

  // ---- Phase 2: singular reshape ----
  // Steps touching `users` only apply while the legacy table still exists.
  const { rows: legacyRows } = await pool.query(
    `SELECT to_regclass('public.users') AS reg`,
  );
  const legacyUsersExists = legacyRows[0]?.reg !== null;

  if (legacyUsersExists) {
  // 2a. users.name -> first_name + last_name (backfill from full name).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);`);
  await pool.query(`
    UPDATE users
    SET first_name = NULLIF(split_part(name, ' ', 1), ''),
        last_name = COALESCE(NULLIF(substr(name, length(split_part(name, ' ', 1)) + 2), ''), '')
    WHERE first_name IS NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'name'
    );
  `);
  await pool.query(`UPDATE users SET first_name = 'Unknown' WHERE first_name IS NULL OR first_name = '';`);
  await pool.query(`UPDATE users SET last_name = '' WHERE last_name IS NULL;`);
  await pool.query(`ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;`);
  await pool.query(`ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;`);
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'name') THEN
        ALTER TABLE users DROP COLUMN name;
      END IF;
    END $$;
  `);

  // 2b. Student/admin flags, derived from role (single backfill source).
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_student BOOLEAN NOT NULL DEFAULT TRUE;`,
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;`,
  );
  await pool.query(`
    UPDATE users
    SET is_student = (role = 'school_user'),
        is_admin = (role IN ('admin', 'super_admin'));
  `);
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS user_flags_check;`);
  await pool.query(
    `ALTER TABLE users ADD CONSTRAINT user_flags_check CHECK (NOT (is_student AND is_admin));`,
  );
  } // end legacy-users reshape (skipped once users is renamed to "user")

  // 2c. Rename plural tables to singular (FKs follow by OID, no re-point needed).
  await pool.query(`
    DO $$ BEGIN
      IF to_regclass('public.users') IS NOT NULL AND to_regclass('public."user"') IS NULL THEN
        ALTER TABLE users RENAME TO "user";
      END IF;
    END $$;
  `);
  await pool.query(`
    DO $$ BEGIN
      IF to_regclass('public.refresh_tokens') IS NOT NULL AND to_regclass('public.refresh_token') IS NULL THEN
        ALTER TABLE refresh_tokens RENAME TO refresh_token;
      END IF;
    END $$;
  `);
  await pool.query(`
    DO $$ BEGIN
      IF to_regclass('public.email_otps') IS NOT NULL AND to_regclass('public.email_otp') IS NULL THEN
        ALTER TABLE email_otps RENAME TO email_otp;
      END IF;
    END $$;
  `);
  await pool.query(`
    DO $$ BEGIN
      IF to_regclass('public.items') IS NOT NULL AND to_regclass('public.item') IS NULL THEN
        ALTER TABLE items RENAME TO item;
      END IF;
    END $$;
  `);
  await pool.query(
    `ALTER TABLE "user" RENAME CONSTRAINT users_role_check TO user_role_check;`,
  ).catch(() => undefined);

  // 2d. Lookup tables: building -> location, category.
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

  // 2e. report (parent of item): who + where + when.
  // Status lives on request rows, not here.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS report (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      location_id UUID REFERENCES location(id) ON DELETE RESTRICT,
      report_type VARCHAR(10) NOT NULL
        CHECK (report_type IN ('lost', 'found')),
      date DATE NOT NULL,
      time TIME,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // DBs created before the status move still carry report.status: drop it
  // (no data to preserve — pre-production schema).
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'report' AND column_name = 'status') THEN
        ALTER TABLE report DROP COLUMN status;
      END IF;
    END $$;
  `);

  // 2f. item reshape: reporter_id/report_type/item_date/category-text
  //     become report_id/category_id. One report per legacy item row.
  await pool.query(`ALTER TABLE item ADD COLUMN IF NOT EXISTS report_id UUID;`);
  await pool.query(`ALTER TABLE item ADD COLUMN IF NOT EXISTS category_id UUID;`);
  const { rows: legacyItems } = await pool.query(
    `SELECT id, reporter_id, report_type, item_date, category FROM item WHERE report_id IS NULL`,
  ).catch(() => ({ rows: [] as never[] }));
  for (const legacy of legacyItems as Array<{
    id: string;
    reporter_id: string;
    report_type: string;
    item_date: string;
    category: string;
  }>) {
    const { rows: catRows } = await pool.query(
      `INSERT INTO category (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [legacy.category],
    );
    const { rows: reportRows } = await pool.query(
      `INSERT INTO report (user_id, report_type, date, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [legacy.reporter_id, legacy.report_type, legacy.item_date],
    );
    await pool.query(`UPDATE item SET report_id = $2, category_id = $3 WHERE id = $1`, [
      legacy.id,
      reportRows[0].id,
      catRows[0].id,
    ]);
  }
  await pool.query(`ALTER TABLE item ALTER COLUMN report_id SET NOT NULL;`);
  await pool.query(`ALTER TABLE item ALTER COLUMN category_id SET NOT NULL;`);
  await pool.query(
    `ALTER TABLE item DROP CONSTRAINT IF EXISTS item_report_id_fkey;`,
  );
  await pool.query(
    `ALTER TABLE item ADD CONSTRAINT item_report_id_fkey
     FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE;`,
  );
  await pool.query(
    `ALTER TABLE item DROP CONSTRAINT IF EXISTS item_category_id_fkey;`,
  );
  await pool.query(
    `ALTER TABLE item ADD CONSTRAINT item_category_id_fkey
     FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE RESTRICT;`,
  );
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'item' AND column_name = 'reporter_id') THEN
        ALTER TABLE item DROP COLUMN reporter_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'item' AND column_name = 'report_type') THEN
        ALTER TABLE item DROP COLUMN report_type;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'item' AND column_name = 'item_date') THEN
        ALTER TABLE item DROP COLUMN item_date;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'item' AND column_name = 'category') THEN
        ALTER TABLE item DROP COLUMN category;
      END IF;
    END $$;
  `);

  // 2g. image (many per item) and request (claim/return asks on an item).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS image (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url TEXT NOT NULL,
      item_id UUID NOT NULL REFERENCES item(id) ON DELETE CASCADE
    );
  `);

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
  // Widen pre-move request.status (pending/approved/rejected) to the full set.
  await pool.query(`ALTER TABLE request DROP CONSTRAINT IF EXISTS request_status_check;`);
  await pool.query(
    `ALTER TABLE request ADD CONSTRAINT request_status_check
     CHECK (status IN ('pending', 'approved', 'claimed', 'returned', 'rejected'));`,
  );

  await pool.query(`
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_users_role;
    DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
    DROP INDEX IF EXISTS idx_items_reporter_id;
    DROP INDEX IF EXISTS idx_items_report_type;
    DROP INDEX IF EXISTS idx_items_category;
    DROP INDEX IF EXISTS idx_email_otps_user_id;
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
}

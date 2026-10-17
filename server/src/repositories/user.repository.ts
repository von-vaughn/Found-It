import { pool } from '../config/db';
import type { Role, SafeUser } from '../types/roles';

interface SafeUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  must_change_password?: boolean;
  failed_login_attempts?: number;
  login_locked_until?: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserWithHashRow extends SafeUserRow {
  password_hash: string;
}

export interface UserWithHash extends SafeUser {
  passwordHash: string;
  failedLoginAttempts: number;
  loginLockedUntil: Date | null;
}

const SAFE_USER_COLUMNS = `
  id, first_name, last_name, email, role, is_active, is_verified,
  must_change_password, failed_login_attempts, login_locked_until,
  created_at, updated_at
`;

function toSafeUser(row: SafeUserRow): SafeUser {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    isVerified: row.is_verified,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<SafeUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<SafeUserRow>(
    `SELECT ${SAFE_USER_COLUMNS} FROM "user" WHERE email = $1 LIMIT 1`,
    [normalized],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function findUserWithHashByEmail(email: string): Promise<UserWithHash | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<UserWithHashRow>(
    `SELECT ${SAFE_USER_COLUMNS}, password_hash FROM "user" WHERE email = $1 LIMIT 1`,
    [normalized],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...toSafeUser(row),
    passwordHash: row.password_hash,
    failedLoginAttempts: row.failed_login_attempts ?? 0,
    loginLockedUntil: row.login_locked_until ? new Date(row.login_locked_until) : null,
  };
}

export async function findUserById(id: string): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `SELECT ${SAFE_USER_COLUMNS} FROM "user" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role?: Role;
  isVerified?: boolean;
  mustChangePassword?: boolean;
}): Promise<SafeUser> {
  const role = input.role ?? 'school_user';
  const isVerified = input.isVerified ?? false;
  const mustChangePassword = input.mustChangePassword ?? false;
  const { rows } = await pool.query<SafeUserRow>(
    `INSERT INTO "user" (first_name, last_name, email, password_hash, role, is_student, is_admin, is_verified, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${SAFE_USER_COLUMNS}`,
    [
      input.firstName.trim(),
      input.lastName.trim(),
      input.email.trim().toLowerCase(),
      input.passwordHash,
      role,
      role === 'school_user',
      role !== 'school_user',
      isVerified,
      mustChangePassword,
    ],
  );
  return toSafeUser(rows[0]);
}

/** Overwrites stored name and password hash for existing unverified accounts to prevent pre-registration lockouts */
export async function updateUserRegistration(
  id: string,
  input: { firstName: string; lastName: string; passwordHash: string },
): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE "user"
     SET first_name = $2, last_name = $3, password_hash = $4, updated_at = NOW()
     WHERE id = $1
     RETURNING ${SAFE_USER_COLUMNS}`,
    [id, input.firstName.trim(), input.lastName.trim(), input.passwordHash],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function recordFailedLogin(id: string): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const { rows } = await pool.query<{ failed_login_attempts: number }>(
    // A prior lockout that has expired starts the count over: "5 consecutive failures"
    `UPDATE "user"
     SET failed_login_attempts = CASE
           WHEN login_locked_until IS NOT NULL AND login_locked_until <= NOW() THEN 1
           ELSE failed_login_attempts + 1
         END,
         login_locked_until = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING failed_login_attempts`,
    [id],
  );
  const attempts = rows[0]?.failed_login_attempts ?? 0;
  if (attempts >= 5) {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15m lockout
    await pool.query(
      `UPDATE "user" SET login_locked_until = $2 WHERE id = $1`,
      [id, lockedUntil],
    );
    return { locked: true, lockedUntil };
  }
  return { locked: false, lockedUntil: null };
}

export async function resetFailedLogin(id: string): Promise<void> {
  await pool.query(
    `UPDATE "user"
     SET failed_login_attempts = 0, login_locked_until = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id],
  );
}

export async function listUsers(filter?: { role?: Role; search?: string }): Promise<SafeUser[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter?.role) {
    params.push(filter.role);
    conditions.push(`role = $${params.length}`);
  }
  if (filter?.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    conditions.push(`(LOWER(first_name || ' ' || last_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<SafeUserRow>(
    `SELECT ${SAFE_USER_COLUMNS} FROM "user" ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return rows.map(toSafeUser);
}

export async function updateUserRole(id: string, role: Role): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE "user" SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING ${SAFE_USER_COLUMNS}`,
    [id, role],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE "user" SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING ${SAFE_USER_COLUMNS}`,
    [id, isActive],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await pool.query(
    `UPDATE "user"
     SET password_hash = $2, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $1`,
    [id, passwordHash],
  );
}

export async function setUserVerified(id: string): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE "user"
     SET is_verified = TRUE, verification_failed_attempts = 0, verification_locked_until = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING ${SAFE_USER_COLUMNS}`,
    [id],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM "user" WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function countSuperAdmins(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "user" WHERE role = 'super_admin'`,
  );
  return Number(rows[0]?.count ?? 0);
}

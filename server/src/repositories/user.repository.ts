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
  created_at: Date;
  updated_at: Date;
}

interface UserListRow extends SafeUserRow {
  report_count: number;
}

interface UserWithHashRow extends SafeUserRow {
  password_hash: string;
}

export interface UserWithHash extends SafeUser {
  passwordHash: string;
}

const SAFE_USER_COLUMNS = `
  id, first_name, last_name, email, role, is_active, is_verified,
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
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<SafeUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<SafeUserRow>(
    // LOWER(email) matches the case-insensitive unique index; input is normalized above
    `SELECT ${SAFE_USER_COLUMNS} FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function findUserWithHashByEmail(email: string): Promise<UserWithHash | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await pool.query<UserWithHashRow>(
    `SELECT ${SAFE_USER_COLUMNS}, password_hash FROM "user" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...toSafeUser(row),
    passwordHash: row.password_hash,
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
}): Promise<SafeUser> {
  const role = input.role ?? 'school_user';
  const isVerified = input.isVerified ?? false;
  const { rows } = await pool.query<SafeUserRow>(
    `INSERT INTO "user" (first_name, last_name, email, password_hash, role, is_student, is_admin, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

export async function listUsers(
  filter?: { role?: Role; search?: string },
): Promise<Array<SafeUser & { reportCount: number }>> {
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
  const { rows } = await pool.query<UserListRow>(
    `SELECT ${SAFE_USER_COLUMNS},
       (SELECT COUNT(*)::int FROM report WHERE report.user_id = "user".id) AS report_count
     FROM "user" ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return rows.map((row) => ({
    ...toSafeUser(row),
    reportCount: row.report_count,
  }));
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
     SET password_hash = $2, updated_at = NOW()
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

import { pool } from '../config/db';
import type { Role, SafeUser } from '../types/roles';

interface SafeUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string | null;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  has_seen_tutorial: boolean;
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
  id, first_name, last_name, email, school_id, role, is_active, is_verified,
  has_seen_tutorial, created_at, updated_at
`;

function toSafeUser(row: SafeUserRow): SafeUser {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    ...(row.school_id ? { schoolId: row.school_id } : {}),
    role: row.role,
    isActive: row.is_active,
    isVerified: row.is_verified,
    hasSeenTutorial: row.has_seen_tutorial,
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
  schoolId?: string | null;
  passwordHash: string;
  role?: Role;
  isVerified?: boolean;
}): Promise<SafeUser> {
  const role = input.role ?? 'school_user';
  const isVerified = input.isVerified ?? false;
  const schoolId = input.schoolId?.trim() || null;
  const { rows } = await pool.query<SafeUserRow>(
    `INSERT INTO "user" (first_name, last_name, email, school_id, password_hash, role, is_student, is_admin, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${SAFE_USER_COLUMNS}`,
    [
      input.firstName.trim(),
      input.lastName.trim(),
      input.email.trim().toLowerCase(),
      schoolId,
      input.passwordHash,
      role,
      role === 'school_user',
      role !== 'school_user',
      isVerified,
    ],
  );
  return toSafeUser(rows[0]);
}

export async function listUsersPage(
  filter?: { role?: Role; search?: string },
  pagination: { limit: number; offset: number } = { limit: 200, offset: 0 },
): Promise<{ users: Array<SafeUser & { reportCount: number }>; hasMore: boolean }> {
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
  params.push(pagination.limit + 1);
  const limitParam = `$${params.length}`;
  params.push(pagination.offset);
  const offsetParam = `$${params.length}`;
  const { rows } = await pool.query<UserListRow>(
    `SELECT ${SAFE_USER_COLUMNS},
       (SELECT COUNT(*)::int FROM report WHERE report.user_id = "user".id) AS report_count
     FROM "user" ${where} ORDER BY created_at DESC, id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params,
  );
  const hasMore = rows.length > pagination.limit;
  const pageRows = hasMore ? rows.slice(0, pagination.limit) : rows;
  return {
    users: pageRows.map((row) => ({
      ...toSafeUser(row),
      reportCount: row.report_count,
    })),
    hasMore,
  };
}

export async function listUsers(
  filter?: { role?: Role; search?: string },
): Promise<Array<SafeUser & { reportCount: number }>> {
  const { users } = await listUsersPage(filter);
  return users;
}

export async function updateUserRole(id: string, role: Role): Promise<SafeUser | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE "user"
     SET role = $2,
         is_student = $3,
         is_admin = $4,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${SAFE_USER_COLUMNS}`,
    [id, role, role === 'school_user', role !== 'school_user'],
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

export async function markUserTutorialSeen(id: string): Promise<void> {
  await pool.query(
    `UPDATE "user"
     SET has_seen_tutorial = TRUE, updated_at = NOW()
     WHERE id = $1`,
    [id],
  );
}

export async function deleteUser(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM "user" WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

/**
 * Serializes mutations that could remove/deactivate an active super_admin so
 * concurrent requests can never leave the system with zero active super_admins.
 */
export async function runWithActiveSuperAdminGuard<T>(
  fn: (activeSuperAdminCount: number) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "user" WHERE role = 'super_admin' AND is_active = TRUE FOR UPDATE`,
    );
    const result = await fn(rows.length);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

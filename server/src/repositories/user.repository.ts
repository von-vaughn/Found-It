import { pool } from '../config/db';
import type { Role, SafeUser } from '../types/roles';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithHash extends SafeUser {
  passwordHash: string;
}

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    isVerified: row.is_verified,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toUserWithHash(row: UserRow): UserWithHash {
  return { ...toSafeUser(row), passwordHash: row.password_hash };
}

export async function findUserByEmail(email: string): Promise<UserWithHash | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [
    email.toLowerCase(),
  ]);
  return rows[0] ? toUserWithHash(rows[0]) : null;
}

export async function findUserById(id: string): Promise<UserWithHash | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] ? toUserWithHash(rows[0]) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}): Promise<SafeUser> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.name,
      input.email.toLowerCase(),
      input.passwordHash,
      input.role ?? 'school_user',
    ],
  );
  return toSafeUser(rows[0]);
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
    conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return rows.map(toSafeUser);
}

export async function updateUserRole(id: string, role: Role): Promise<SafeUser | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, role],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function setUserActive(id: string, isActive: boolean): Promise<SafeUser | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, isActive],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await pool.query(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [
    id,
    passwordHash,
  ]);
}

export async function setUserVerified(id: string): Promise<SafeUser | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] ? toSafeUser(rows[0]) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function countSuperAdmins(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users WHERE role = 'super_admin'`,
  );
  return Number(rows[0]?.count ?? 0);
}

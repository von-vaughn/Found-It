import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsersPage,
  runWithActiveAdminGuard,
  setUserActive,
  updateUserRole,
} from '../repositories/user.repository';
import { recordAuditLog } from '../repositories/audit-log.repository';
import { revokeAllUserTokens } from '../repositories/refresh-token.repository';
import { ROLES, type Role } from '../types/roles';
import { hashPassword } from '../utils/password';
import { parsePagination } from '../validation/pagination';

const roleSchema = z.object({ role: z.enum(ROLES) });
const activeSchema = z.object({ isActive: z.boolean() });

function roleDisplay(role: Role): string {
  if (role === 'admin') return 'Admin';
  if (role === 'staff') return 'Staff';
  return 'School user';
}
const createAdminSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .refine((name) => {
      const [firstName, ...lastNameParts] = name.split(/\s+/);
      const lastName = lastNameParts.join(' ') || firstName;
      return firstName.length <= 50 && lastName.length <= 50;
    }, 'Each part of the name must be at most 50 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 bytes')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Password cannot exceed 72 bytes',
    }),
  role: z.enum(['staff', 'admin']),
}).strict();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

function invalidId(res: Response, id: string): boolean {
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: 'User not found.' });
    return true;
  }
  return false;
}

/** POST /api/users — admin only */
export async function createAdminUser(req: Request, res: Response): Promise<void> {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: 'Validation failed.',
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const { name, email, password, role } = parsed.data;
  if (await findUserByEmail(email)) {
    res.status(409).json({ message: 'An account with this email already exists.' });
    return;
  }

  const [firstName, ...lastNameParts] = name.split(/\s+/);
  const lastName = lastNameParts.join(' ') || firstName;
  let created: Awaited<ReturnType<typeof createUser>>;
  try {
    created = await createUser({
      firstName,
      lastName,
      email,
      passwordHash: await hashPassword(password),
      role,
      isVerified: true,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }

  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'created',
    entityType: 'user',
    entityId: created.id,
    summary: `Created ${roleDisplay(role)} account for ${created.email}`,
  });

  res.status(201).json({
    message: 'Account created.',
    user: { ...created, reportCount: 0 },
  });
}

/** GET /api/users — admin only */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  const role = typeof req.query.role === 'string' ? (req.query.role as Role) : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  if (role && !ROLES.includes(role)) {
    res.status(400).json({ message: `Invalid role filter. Allowed: ${ROLES.join(', ')}` });
    return;
  }
  const pagination = parsePagination(req.query, { limit: 200, maxLimit: 200 });
  const { users, hasMore } = await listUsersPage({ role, search }, pagination);
  res.json({ users, count: users.length, hasMore });
}

/** GET /api/users/:id — self or admin */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const isSelf = req.user!.sub === target.id;
  const isAdmin = req.user!.role === 'admin';
  if (!isSelf && !isAdmin) {
    res.status(403).json({ message: 'Forbidden.' });
    return;
  }
  res.json({ user: target });
}

/**
 * PATCH /api/users/:id/role — admin only.
 * Guards: cannot change own role; cannot demote the last active admin.
 */
export async function changeUserRole(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: `Invalid role. Allowed: ${ROLES.join(', ')}` });
    return;
  }
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  if (target.id === req.user!.sub) {
    res.status(400).json({ message: 'You cannot change your own role.' });
    return;
  }
  if (target.role === 'admin' && parsed.data.role !== 'admin') {
    const updated = await runWithActiveAdminGuard(async (count) => {
      if (target.isActive && count <= 1) return null;
      return updateUserRole(target.id, parsed.data.role);
    });
    if (!updated) {
      res.status(400).json({ message: 'Cannot demote the last active admin.' });
      return;
    }
    await revokeAllUserTokens(target.id);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'updated',
      entityType: 'user',
      entityId: target.id,
      summary: `Changed role for ${target.email} from ${roleDisplay(target.role)} to ${roleDisplay(parsed.data.role)}`,
    });
    res.json({ message: `Role updated to ${roleDisplay(parsed.data.role)}.`, user: updated });
    return;
  }
  const updated = await updateUserRole(target.id, parsed.data.role);
  if (updated && target.role !== parsed.data.role) {
    await revokeAllUserTokens(target.id);
    await recordAuditLog({
      actorId: req.user!.sub,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'updated',
      entityType: 'user',
      entityId: target.id,
      summary: `Changed role for ${target.email} from ${roleDisplay(target.role)} to ${roleDisplay(parsed.data.role)}`,
    });
  }
  res.json({ message: `Role updated to ${roleDisplay(parsed.data.role)}.`, user: updated });
}

/**
 * PATCH /api/users/:id/status — admin only.
 * Cannot deactivate the last active admin.
 */
export async function changeUserStatus(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const parsed = activeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Body must be { "isActive": boolean }.' });
    return;
  }
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  if (target.id === req.user!.sub) {
    res.status(400).json({ message: 'You cannot change your own status.' });
    return;
  }
  const updated = !parsed.data.isActive && target.role === 'admin'
    ? await runWithActiveAdminGuard(async (count) => {
        if (target.isActive && count <= 1) return null;
        return setUserActive(target.id, false);
      })
    : await setUserActive(target.id, parsed.data.isActive);
  if (!updated && !parsed.data.isActive && target.role === 'admin') {
    res.status(400).json({ message: 'Cannot deactivate the last active admin.' });
    return;
  }
  if (!parsed.data.isActive) await revokeAllUserTokens(target.id);
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'updated',
    entityType: 'user',
    entityId: target.id,
    summary: `${parsed.data.isActive ? 'Activated' : 'Deactivated'} user ${target.email}`,
  });
  res.json({ message: parsed.data.isActive ? 'User activated.' : 'User deactivated.', user: updated });
}

/**
 * DELETE /api/users/:id — admin only (anyone except self/last admin).
 */
export async function removeUser(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  if (target.id === req.user!.sub) {
    res.status(400).json({ message: 'You cannot delete your own account.' });
    return;
  }
  if (target.role === 'admin') {
    const deleted = await runWithActiveAdminGuard(async (count) => {
      if (target.isActive && count <= 1) return false;
      return deleteUser(target.id);
    });
    if (!deleted) {
      res.status(400).json({ message: 'Cannot delete the last active admin.' });
      return;
    }
  } else {
    await deleteUser(target.id);
  }
  await recordAuditLog({
    actorId: req.user!.sub,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'deleted',
    entityType: 'user',
    entityId: target.id,
    summary: `Deleted user ${target.email}`,
  });
  res.json({ message: 'User deleted.' });
}

import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  countSuperAdmins,
  deleteUser,
  findUserById,
  listUsers,
  setUserActive,
  updateUserRole,
} from '../repositories/user.repository';
import { revokeAllUserTokens } from '../repositories/refresh-token.repository';
import { ROLES, type Role } from '../types/roles';

const roleSchema = z.object({ role: z.enum(ROLES) });
const activeSchema = z.object({ isActive: z.boolean() });

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

/** GET /api/users — admin + super_admin */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  const role = typeof req.query.role === 'string' ? (req.query.role as Role) : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  if (role && !ROLES.includes(role)) {
    res.status(400).json({ message: `Invalid role filter. Allowed: ${ROLES.join(', ')}` });
    return;
  }
  const users = await listUsers({ role, search });
  res.json({ users, count: users.length });
}

/** GET /api/users/:id — self, admin, super_admin */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = getId(req);
  if (invalidId(res, id)) return;
  const target = await findUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }
  const isSelf = req.user!.sub === target.id;
  const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'super_admin';
  if (!isSelf && !isPrivileged) {
    res.status(403).json({ message: 'Forbidden.' });
    return;
  }
  const { passwordHash: _omit, ...safe } = target;
  res.json({ user: safe });
}

/**
 * PATCH /api/users/:id/role — super_admin only.
 * Guards: cannot change own role; cannot demote the last super_admin.
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
  if (target.role === 'super_admin' && parsed.data.role !== 'super_admin') {
    const count = await countSuperAdmins();
    if (count <= 1) {
      res.status(400).json({ message: 'Cannot demote the last super_admin.' });
      return;
    }
  }
  const updated = await updateUserRole(target.id, parsed.data.role);
  res.json({ message: `Role updated to ${parsed.data.role}.`, user: updated });
}

/**
 * PATCH /api/users/:id/status — admin + super_admin.
 * admin may only (de)activate plain `school_user`s; super_admin may touch anyone except self.
 * Cannot deactivate the last super_admin.
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
  if (req.user!.role === 'admin' && target.role !== 'school_user') {
    res.status(403).json({ message: 'Admins can only manage users with role "school_user".' });
    return;
  }
  if (!parsed.data.isActive && target.role === 'super_admin') {
    const count = await countSuperAdmins();
    if (count <= 1) {
      res.status(400).json({ message: 'Cannot deactivate the last super_admin.' });
      return;
    }
  }
  const updated = await setUserActive(target.id, parsed.data.isActive);
  if (!parsed.data.isActive) await revokeAllUserTokens(target.id);
  res.json({ message: parsed.data.isActive ? 'User activated.' : 'User deactivated.', user: updated });
}

/**
 * DELETE /api/users/:id — admin (school_user-role targets only) + super_admin (anyone except self/last super_admin).
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
  if (req.user!.role === 'admin' && target.role !== 'school_user') {
    res.status(403).json({ message: 'Admins can only delete users with role "school_user".' });
    return;
  }
  if (target.role === 'super_admin') {
    const count = await countSuperAdmins();
    if (count <= 1) {
      res.status(400).json({ message: 'Cannot delete the last super_admin.' });
      return;
    }
  }
  await deleteUser(target.id);
  res.json({ message: 'User deleted.' });
}

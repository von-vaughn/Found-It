import type { NextFunction, Request, Response } from 'express';
import { ROLE_LEVEL, type Role } from '../types/roles';

/**
 * Role-based authorization.
 *
 * Usage:
 *   authorize('staff')              -> staff + admin allowed
 *   authorize('admin')              -> admin only
 *   authorize('school_user', 'staff', ...) -> any of the listed roles (hierarchy-aware via minimum level)
 *
 * The check is hierarchy-aware: passing 'staff' allows 'staff' and 'admin'.
 * Passing multiple roles allows any role at/above the lowest listed level.
 */
export function authorize(...allowed: Role[]) {
  const minLevel = Math.min(...allowed.map((r) => ROLE_LEVEL[r]));
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    if (ROLE_LEVEL[req.user.role] < minLevel) {
      res.status(403).json({
        message: `Forbidden. Requires one of: ${allowed.join(', ')}.`,
      });
      return;
    }
    next();
  };
}

/** Convenience guards */
export const requireStaff = authorize('staff'); // staff + admin
export const requireAdmin = authorize('admin'); // admin only

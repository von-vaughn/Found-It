import type { NextFunction, Request, Response } from 'express';
import { ROLE_LEVEL, type Role } from '../types/roles';

/**
 * Role-based authorization.
 *
 * Usage:
 *   authorize('admin')              -> admin + super_admin allowed
 *   authorize('super_admin')        -> super_admin only
 *   authorize('school_user', 'admin', ...) -> any of the listed roles (hierarchy-aware via minimum level)
 *
 * The check is hierarchy-aware: passing 'admin' allows 'admin' and 'super_admin'.
 * Passing multiple roles allows any role at/above the lowest listed level...
 * for exact-match semantics use `authorizeExact`.
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

/** Strict exact-role match (no hierarchy). */
export function authorizeExact(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ message: `Forbidden. Requires one of: ${allowed.join(', ')}.` });
      return;
    }
    next();
  };
}

/** Convenience guards */
export const requireAdmin = authorize('admin'); // admin + super_admin
export const requireSuperAdmin = authorize('super_admin'); // super_admin only

import type { NextFunction, Request, Response } from 'express';

const ALLOWED_PATHS = [
  '/api/auth/change-password',
  '/api/auth/me',
  '/api/auth/logout',
];

export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.mustChangePassword) {
    const isAllowed = ALLOWED_PATHS.some((path) => req.originalUrl.startsWith(path));
    if (!isAllowed) {
      res.status(403).json({
        message: 'Password change required before accessing this resource.',
        mustChangePassword: true,
      });
      return;
    }
  }
  next();
}

import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error';

/**
 * Restricts a route to users holding at least one of the given roles.
 * Must run after requireAuth. Roles come from the JWT payload (req.user.roles),
 * which mirrors the user_roles table at the time the access token was issued.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'unauthorized', 'Authentication required'));
    }
    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return next(new ApiError(403, 'forbidden', `Requires one of roles: ${allowedRoles.join(', ')}`));
    }
    next();
  };
}

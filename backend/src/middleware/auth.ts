import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { ApiError } from './error';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[] };
    }
  }
}

/** Requires a valid access token. Attaches req.user = { id, roles }. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'unauthorized', 'Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles };
    next();
  } catch {
    next(new ApiError(401, 'unauthorized', 'Invalid or expired access token'));
  }
}

/** Like requireAuth but does not fail if no token is present — used for endpoints that behave differently for guests vs logged-in users. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, roles: payload.roles };
  } catch {
    // Ignore invalid token in optional mode
  }
  next();
}

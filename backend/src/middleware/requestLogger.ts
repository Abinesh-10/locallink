import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Attaches a unique X-Request-ID to every request and logs each HTTP
 * transaction (method, path, status, duration) when the response finishes.
 * Accepts an incoming X-Request-ID header so distributed systems and
 * load-balancers can propagate their own trace IDs end-to-end.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) || uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('HTTP', {
      requestId: id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: duration,
      ip: req.ip,
    });
  });

  next();
}

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/** Application-level error carrying an HTTP status and a machine-readable code. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** RFC 7807-ish problem details response. */
function problemDetails(status: number, code: string, message: string, details?: unknown) {
  return {
    type: `https://locallink.app/errors/${code}`,
    title: code,
    status,
    detail: message,
    ...(details ? { errors: details } : {}),
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(problemDetails(404, 'not_found', `Route ${req.method} ${req.path} not found`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      logger.error(err.message, { code: err.code, path: req.path, details: err.details });
    }
    res.status(err.status).json(problemDetails(err.status, err.code, err.message, err.details));
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled error', { message, path: req.path, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json(problemDetails(500, 'internal_server_error', 'Something went wrong. Please try again.'));
}

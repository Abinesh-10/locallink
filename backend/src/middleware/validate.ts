import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from './error';

/**
 * Runs an array of express-validator chains, then short-circuits with a 422
 * if any failed. Usage: router.post('/x', validate([body('email').isEmail()]), handler)
 */
export function validate(chains: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(chains.map((chain) => chain.run(req)));
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return next(new ApiError(422, 'validation_error', 'Request validation failed', result.array()));
    }
    next();
  };
}

import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { validate } from '../../middleware/validate';
import { getReputation } from './service';
import { ApiError } from '../../middleware/error';

const router = Router();

router.get(
  '/users/:id/reputation',
  validate([param('id').isUUID()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reputation = await getReputation(req.params.id);
      if (!reputation) {
        throw new ApiError(404, 'not_found', 'No reputation record for this user.');
      }
      res.json({ success: true, reputation });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

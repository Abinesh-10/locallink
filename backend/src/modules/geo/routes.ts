import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../../middleware/validate';
import { reverseGeocode } from '../../lib/geo';
import { Request, Response, NextFunction } from 'express';

const router = Router();

router.get(
  '/reverse',
  validate([
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const result = await reverseGeocode(lat, lng);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/db';

const router = Router();

/**
 * GET /rental-categories — same rationale as hire's /service-categories:
 * not in doc §4's endpoint list, but GET /rentals?category= needs real
 * category UUIDs the frontend has no other way to discover. Returns
 * `names` as-is (jsonb, e.g. {"en": "Power Tools", "ta": "..."}) rather
 * than flattening to name_en/name_ta, since that's the actual schema shape
 * for this table (unlike service_categories' flat columns).
 */
router.get('/rental-categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT id, slug, names, icon FROM rental_categories ORDER BY slug');
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/db';

const router = Router();

/**
 * GET /service-categories — not explicitly listed in doc §4, but required:
 * GET /workers?category= takes a category UUID, and the frontend has no
 * other way to discover valid category IDs/labels for the filter chips.
 * Read-only, unauthenticated (categories are public reference data).
 */
router.get('/service-categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT id, slug, name_en, name_ta, name_hi, name_te, name_ml, icon FROM service_categories ORDER BY name_en'
    );
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

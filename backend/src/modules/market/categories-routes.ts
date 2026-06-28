import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../config/db';

const router = Router();

/**
 * GET /product-categories — same rationale as hire/rent's category
 * endpoints: not in doc §4's endpoint list, but GET /products?category=
 * needs real category UUIDs the frontend has no other way to discover.
 * No `icon` column exists on this table (unlike rental_categories), so
 * the frontend maps icons by slug locally instead.
 */
router.get('/product-categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT id, slug, names, parent_id FROM product_categories ORDER BY slug');
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createReportSchema } from './schema';
import * as service from './service';

const router = Router();

router.use(requireAuth);

router.post('/reports', validate(createReportSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await service.createReport(req.user!.id, req.body.targetType, req.body.targetId, req.body.reason);
    res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
});

// Not explicitly named in doc §4 (which only lists the admin-side GET
// /admin/reports), but lets a reporting user see the status of reports
// they've personally filed.
router.get('/reports/mine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await service.listMyReports(req.user!.id);
    res.json({ success: true, reports });
  } catch (err) {
    next(err);
  }
});

export default router;

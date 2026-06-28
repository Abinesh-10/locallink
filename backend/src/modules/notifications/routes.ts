import { Router, Request, Response, NextFunction } from 'express';
import { param, query as queryValidator } from 'express-validator';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as service from './service';

const router = Router();

router.use(requireAuth);

router.get(
  '/notifications',
  validate([queryValidator('unread').optional().isIn(['true', 'false'])]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await service.listNotifications(req.user!.id, req.query.unread === 'true');
      const unreadCount = await service.getUnreadCount(req.user!.id);
      res.json({ success: true, notifications, unreadCount });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/notifications/:id/read',
  validate([param('id').isUUID()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await service.markAsRead(req.user!.id, req.params.id);
      res.json({ success: true, notification });
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await service.markAllAsRead(req.user!.id);
    res.json({ success: true, markedCount: count });
  } catch (err) {
    next(err);
  }
});

export default router;

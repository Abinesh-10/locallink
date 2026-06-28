import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { isValidRadius } from '../../lib/geo';
import { createNotification } from '../notifications/service';
import { logger } from '../../lib/logger';

export async function createWorkerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.createOrUpdateWorkerProfile(req.user!.id, req.body);
    res.status(201).json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function patchWorkerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.patchWorkerProfile(req.user!.id, req.body);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function getMyWorkerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.getWorkerByUserId(req.user!.id);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function getWorkerById(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.getWorkerByUserId(req.params.id);
    const reviews = await service.listWorkerReviews(req.params.id);
    res.json({ success: true, profile, reviews });
  } catch (err) {
    next(err);
  }
}

export async function searchWorkers(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const result = await service.searchWorkers({
      category: req.query.category as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      verifiedOnly: req.query.verified === 'true',
      sort: (req.query.sort as 'distance' | 'rating' | 'trust') || 'rating',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json({ success: true, workers: result });
  } catch (err) {
    next(err);
  }
}

export async function createServiceRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { workerId, scheduledFor, description } = req.body;
    const request = await service.createServiceRequest(req.user!.id, workerId, scheduledFor, description);

    // Per doc notification trigger: "new request".
    try {
      await createNotification({
        userId: workerId,
        type: 'service_request_new',
        payload: { requestId: request.id, customerId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-request notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
}

export async function listSentRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await service.listMyRequestsAsCustomer(req.user!.id, req.query.status as string | undefined);
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
}

export async function listInboxRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await service.listMyRequestsAsWorker(req.user!.id, req.query.status as string | undefined);
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
}

export async function updateRequestStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await service.updateRequestStatus(req.params.id, req.user!.id, req.body.status);

    // Per doc notification trigger: "status change" — notify the customer
    // (the worker is the one acting, so they don't need to notify themselves).
    try {
      await createNotification({
        userId: request.customer_id,
        type: 'service_request_status',
        payload: { requestId: request.id, status: request.status },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create status-change notification', { error: notifErr.message });
    }

    res.json({ success: true, request });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { workerId, requestId, rating, comment } = req.body;
    const review = await service.createWorkerReview(req.user!.id, workerId, requestId, rating, comment);

    // Per doc notification trigger: "new review".
    try {
      await createNotification({
        userId: workerId,
        type: 'review_new',
        payload: { reviewId: review.id, rating, reviewerId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-review notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
}

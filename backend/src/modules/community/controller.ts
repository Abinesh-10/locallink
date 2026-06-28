import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { isValidRadius } from '../../lib/geo';
import { sendSms } from '../../config/msg91';
import { getSocketServer } from '../../config/socket';
import { logger } from '../../lib/logger';
import { createNotification } from '../notifications/service';

export async function createRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await service.createRequest(req.user!.id, req.body);
    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
}

export async function listRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const requests = await service.listRequests({
      type: req.query.type as string | undefined,
      urgency: req.query.urgency as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
}

export async function getRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await service.getRequestById(req.params.id);
    const responses = await service.listResponses(req.params.id);
    res.json({ success: true, request, responses });
  } catch (err) {
    next(err);
  }
}

export async function respond(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await service.respondToRequest(req.params.id, req.user!.id, req.body.message);

    try {
      const request = await service.getRequestById(req.params.id);
      await createNotification({
        userId: request.requester_id,
        type: 'community_response',
        payload: { requestId: req.params.id, responderId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create community response notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, response });
  } catch (err) {
    next(err);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await service.closeRequest(req.params.id, req.user!.id);
    res.json({ success: true, request });
  } catch (err) {
    next(err);
  }
}

export async function sos(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng, description } = req.body;
    const request = await service.createSosRequest(req.user!.id, { lat, lng, description });

    const contacts = await service.getEmergencyContactsForSms(req.user!.id);
    const smsMessage = `EMERGENCY SOS: ${request.requesterName} needs help. Location: https://www.google.com/maps?q=${lat},${lng}`;
    // sendSms never rejects — it always resolves with {success, error?} —
    // so failures must be checked on the resolved value, not caught via
    // .catch(), which would never fire and would silently swallow errors.
    const smsResults = await Promise.all(contacts.map((contact) => sendSms(contact.phone, smsMessage)));
    smsResults.forEach((result, idx) => {
      if (!result.success) {
        logger.error('SOS SMS failed', { contact: contacts[idx].phone, error: result.error });
      }
    });

    const nearbyUserIds = await service.getNearbyUserIds(lat, lng, 5, req.user!.id);
    let notifiedCount = 0;
    try {
      const io = getSocketServer();
      for (const userId of nearbyUserIds) {
        io.to(`user:${userId}`).emit('sos:alert', {
          requestId: request.id,
          lat,
          lng,
          description: description ?? null,
          createdAt: request.created_at,
        });
      }
      notifiedCount = nearbyUserIds.length;
    } catch (socketErr: any) {
      // Per this function's design: the DB write and SMS fanout are the
      // critical path. A Socket.IO issue (e.g. server not yet initialized)
      // must not turn an already-successful SOS into a failed request.
      logger.error('SOS socket broadcast failed', { error: socketErr.message });
    }

    res.status(201).json({ success: true, request, notifiedCount });
  } catch (err) {
    next(err);
  }
}

export async function getVolunteers(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : 10;
    const volunteers = await service.getNearbyVolunteers(lat, lng, isValidRadius(radius) ? radius : 10);
    res.json({ success: true, volunteers });
  } catch (err) {
    next(err);
  }
}

export async function createLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.createLostFound(req.user!.id, req.body);
    res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function updateLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.updateLostFound(req.user!.id, req.params.id, req.body);
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function markLostFoundResolved(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.markLostFoundResolved(req.user!.id, req.params.id);
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteLostFound(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.getLostFoundById(req.params.id);
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function listLostFound(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const items = await service.listLostFound({
      kind: req.query.kind as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
    });
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
}

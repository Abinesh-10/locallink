import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { ApiError } from '../../middleware/error';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.getMe(req.user!.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.updateMe(req.user!.id, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng, searchRadiusKm, address } = req.body;
    const user = await service.updateLocation(req.user!.id, lat, lng, searchRadiusKm, address);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateLanguage(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.updateLanguage(req.user!.id, req.body.language);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function addRole(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.addRole(req.user!.id, req.body.role);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function removeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.removeRole(req.user!.id, req.params.role);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function getPhotoUploadSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = await service.getPhotoUploadSignature(req.user!.id);
    res.json({ success: true, ...signature });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cloudinary is not configured')) {
      return next(new ApiError(503, 'service_unavailable', err.message));
    }
    next(err);
  }
}

export async function listEmergencyContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const contacts = await service.listEmergencyContacts(req.user!.id);
    res.json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
}

export async function addEmergencyContact(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await service.addEmergencyContact(req.user!.id, req.body.name, req.body.phone);
    res.status(201).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmergencyContact(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteEmergencyContact(req.user!.id, req.params.contactId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { logAdminAction } from './audit';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await service.listUsers({
      search: req.query.search as string | undefined,
      suspended: req.query.suspended !== undefined ? req.query.suspended === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.getUserById(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// Audit logging happens AFTER the mutation succeeds and BEFORE the
// response is sent — if logAdminAction itself throws, the whole request
// fails as a 500 even though the mutation already committed. This is
// deliberate: unlike best-effort side effects elsewhere in the app (SOS
// SMS, chat notifications), the audit log IS the security control the doc
// requires ("audit log entry on every mutation"), so a broken audit trail
// should surface loudly rather than be silently swallowed.

export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.setUserSuspended(req.params.id, req.body.suspended);

    await logAdminAction({
      adminId: req.user!.id,
      action: req.body.suspended ? 'user_suspended' : 'user_unsuspended',
      targetType: 'user',
      targetId: req.params.id,
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function setProfileVerified(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.setProfileVerified(req.params.type, req.params.id, req.body.verified);

    await logAdminAction({
      adminId: req.user!.id,
      action: req.body.verified ? 'profile_verified' : 'profile_unverified',
      targetType: req.params.type,
      targetId: req.params.id,
    });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
}

export async function listVerifications(req: Request, res: Response, next: NextFunction) {
  try {
    const verifications = await service.listVerifications({
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ success: true, verifications });
  } catch (err) {
    next(err);
  }
}

export async function updateVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const verification = await service.updateVerificationStatus(req.params.id, req.body.status);

    await logAdminAction({
      adminId: req.user!.id,
      action: 'verification_reviewed',
      targetType: 'identity_verification',
      targetId: req.params.id,
      meta: { newStatus: req.body.status, affectedUserId: verification.userId, verificationType: verification.type },
    });

    res.json({ success: true, verification });
  } catch (err) {
    next(err);
  }
}

export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const reports = await service.listReports({
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ success: true, reports });
  } catch (err) {
    next(err);
  }
}

export async function updateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await service.updateReportStatus(req.params.id, req.user!.id, req.body.status);

    await logAdminAction({
      adminId: req.user!.id,
      action: 'report_reviewed',
      targetType: 'report',
      targetId: req.params.id,
      meta: { newStatus: req.body.status },
    });

    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await service.listCategories(req.params.type);
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await service.createCategory(req.params.type, req.body.slug, req.body.names, req.body.icon);

    await logAdminAction({
      adminId: req.user!.id,
      action: 'category_created',
      targetType: `${req.params.type}_category`,
      targetId: category.id,
      meta: { slug: req.body.slug },
    });

    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
}

export async function overrideCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const override = await service.setCategoryOverride(
      req.user!.id,
      req.params.type,
      req.params.categoryId,
      req.body.isDisabled,
      req.body.overrides
    );

    await logAdminAction({
      adminId: req.user!.id,
      action: 'category_override_updated',
      targetType: `${req.params.type}_category`,
      targetId: req.params.categoryId,
      meta: { isDisabled: req.body.isDisabled, overrides: req.body.overrides },
    });

    res.json({ success: true, override });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteCategory(req.params.type, req.params.categoryId);

    await logAdminAction({
      adminId: req.user!.id,
      action: 'category_deleted',
      targetType: `${req.params.type}_category`,
      targetId: req.params.categoryId,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getAnalyticsOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await service.getAnalyticsOverview();
    res.json({ success: true, overview });
  } catch (err) {
    next(err);
  }
}

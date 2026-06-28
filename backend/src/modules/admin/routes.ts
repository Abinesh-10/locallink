import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { validate } from '../../middleware/validate';
import {
  listUsersSchema,
  userIdParamSchema,
  suspendUserSchema,
  verifyProfileParamsSchema,
  verifyProfileBodySchema,
  listVerificationsSchema,
  updateVerificationParamsSchema,
  updateVerificationBodySchema,
  listReportsSchema,
  updateReportParamsSchema,
  updateReportBodySchema,
  categoryTypeParamSchema,
  createCategorySchema,
  categoryIdParamSchema,
  overrideCategorySchema,
} from './schema';

const router = Router();

// Every /admin/* route requires both a valid token AND the admin role.
// Note on JWT staleness: req.user.roles reflects the role set at the time
// the access token was issued (max 15 min old), not a live DB read. If an
// admin is demoted, their current token still grants access until it
// expires or they re-login — an inherent tradeoff of JWT role claims.
router.use(requireAuth, requireRole('admin'));

router.get('/admin/users', validate(listUsersSchema), controller.listUsers);
router.get('/admin/users/:id', validate(userIdParamSchema), controller.getUser);
router.patch('/admin/users/:id/suspend', validate(suspendUserSchema), controller.suspendUser);

router.patch(
  '/admin/profiles/:type/:id/verify',
  validate([...verifyProfileParamsSchema, ...verifyProfileBodySchema]),
  controller.setProfileVerified
);

router.get('/admin/verifications', validate(listVerificationsSchema), controller.listVerifications);
router.patch(
  '/admin/verifications/:id',
  validate([...updateVerificationParamsSchema, ...updateVerificationBodySchema]),
  controller.updateVerification
);

router.get('/admin/reports', validate(listReportsSchema), controller.listReports);
router.patch(
  '/admin/reports/:id',
  validate([...updateReportParamsSchema, ...updateReportBodySchema]),
  controller.updateReport
);

router.get('/admin/categories/:type', validate(categoryTypeParamSchema), controller.listCategories);
router.post('/admin/categories/:type', validate(createCategorySchema), controller.createCategory);
router.patch('/admin/categories/:type/:categoryId', validate(overrideCategorySchema), controller.overrideCategory);
router.delete('/admin/categories/:type/:categoryId', validate(categoryIdParamSchema), controller.deleteCategory);

router.get('/admin/analytics/overview', controller.getAnalyticsOverview);

export default router;

import { body, param } from 'express-validator';

export const updateProfileSchema = [
  body('fullName').optional().isString().isLength({ min: 1, max: 120 }),
  body('photoUrl').optional().isURL(),
];

export const updateLocationSchema = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
  body('searchRadiusKm').optional().isIn([5, 10, 15, 25]).withMessage('searchRadiusKm must be one of 5, 10, 15, 25'),
  body('address').optional().isString().isLength({ max: 500 }),
];

export const updateLanguageSchema = [
  body('language').isIn(['en', 'ta', 'hi', 'te', 'ml']).withMessage('Unsupported language code'),
];

const VALID_ROLES = ['customer', 'worker', 'item_owner', 'seller', 'trainer', 'volunteer'];
// 'admin' deliberately excluded — admin role assignment must go through the
// admin module (Phase 7), never self-service via /users/me/roles.
// 'volunteer' is included — per Phase 5's "Nearby Volunteers" feature, this
// is a self-declared availability flag (like the others), not a privileged
// role requiring admin grant.

export const addRoleSchema = [
  body('role').isIn(VALID_ROLES).withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
];

export const removeRoleParamSchema = [
  param('role').isIn(VALID_ROLES).withMessage(`role must be one of: ${VALID_ROLES.join(', ')}`),
];

export const emergencyContactSchema = [
  body('name').isString().isLength({ min: 1, max: 120 }),
  body('phone').matches(/^\+[1-9]\d{7,14}$/).withMessage('Phone must be in E.164 format'),
];

export { VALID_ROLES };

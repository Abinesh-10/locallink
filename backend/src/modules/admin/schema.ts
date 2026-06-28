import { body, param, query } from 'express-validator';

export const listUsersSchema = [
  query('search').optional().isString().isLength({ max: 200 }),
  query('suspended').optional().isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const userIdParamSchema = [param('id').isUUID()];

export const suspendUserSchema = [param('id').isUUID(), body('suspended').isBoolean()];

const VERIFIABLE_PROFILE_TYPES = ['worker', 'rental', 'product', 'trainer'];

export const verifyProfileParamsSchema = [
  param('type').isIn(VERIFIABLE_PROFILE_TYPES).withMessage(`type must be one of: ${VERIFIABLE_PROFILE_TYPES.join(', ')}`),
  param('id').isUUID(),
];
export const verifyProfileBodySchema = [body('verified').isBoolean()];

export const listVerificationsSchema = [
  query('status').optional().isIn(['pending', 'verified', 'rejected']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const updateVerificationParamsSchema = [param('id').isUUID()];
export const updateVerificationBodySchema = [
  body('status').isIn(['verified', 'rejected']).withMessage('status must be verified or rejected'),
];

export const listReportsSchema = [
  query('status').optional().isIn(['open', 'reviewed', 'dismissed', 'actioned']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const updateReportParamsSchema = [param('id').isUUID()];
export const updateReportBodySchema = [
  body('status').isIn(['reviewed', 'dismissed', 'actioned']).withMessage('Invalid status'),
];

const CATEGORY_TYPES = ['service', 'rental', 'product'];

export const categoryTypeParamSchema = [
  param('type').isIn(CATEGORY_TYPES).withMessage(`type must be one of: ${CATEGORY_TYPES.join(', ')}`),
];

export const createCategorySchema = [
  ...categoryTypeParamSchema,
  body('slug').isString().isLength({ min: 1, max: 100 }),
  body('names').isObject(),
  body('icon').optional().isString().isLength({ max: 60 }),
];

export const categoryIdParamSchema = [...categoryTypeParamSchema, param('categoryId').isUUID()];

export const overrideCategorySchema = [
  ...categoryIdParamSchema,
  body('isDisabled').optional().isBoolean(),
  body('overrides').optional().isObject(),
];

export { VERIFIABLE_PROFILE_TYPES, CATEGORY_TYPES };

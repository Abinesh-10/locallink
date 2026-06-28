import { body, param } from 'express-validator';

const REPORTABLE_TYPES = [
  'user',
  'worker_profile',
  'rental_listing',
  'product_listing',
  'course',
  'community_request',
  'chat_message',
];

export const createReportSchema = [
  body('targetType').isIn(REPORTABLE_TYPES).withMessage(`targetType must be one of: ${REPORTABLE_TYPES.join(', ')}`),
  body('targetId').isUUID(),
  body('reason').isString().isLength({ min: 1, max: 1000 }),
];

export const reportIdParamSchema = [param('id').isUUID()];

export { REPORTABLE_TYPES };

import { body, query, param } from 'express-validator';

export const createWorkerProfileSchema = [
  body('categoryId').isUUID().withMessage('categoryId must reference a valid service category'),
  body('subSkills').optional().isArray({ max: 20 }),
  body('subSkills.*').optional().isString().isLength({ max: 60 }),
  body('experienceYears').optional().isInt({ min: 0, max: 70 }),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('dayRate').optional().isFloat({ min: 0 }),
  body('bio').optional().isString().isLength({ max: 2000 }),
  // Per doc: "photos ≤ 6 × 5MB" — size is enforced client-side at upload
  // time (Cloudinary signed upload), the API only enforces the count here.
  body('portfolioUrls').optional().isArray({ max: 6 }),
  body('portfolioUrls.*').optional().isURL(),
  body('isAvailable').optional().isBoolean(),
];

export const updateWorkerProfileSchema = createWorkerProfileSchema.map((chain) => chain.optional());

export const searchWorkersSchema = [
  query('category').optional().isUUID(),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']).withMessage('radius must be one of 5, 10, 15, 25'),
  query('minRating').optional().isFloat({ min: 0, max: 5 }),
  query('verified').optional().isIn(['true', 'false']),
  query('sort').optional().isIn(['distance', 'rating', 'trust']).withMessage('sort must be distance, rating, or trust'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const workerIdParamSchema = [param('id').isUUID().withMessage('id must be a valid user id')];

export const createServiceRequestSchema = [
  body('workerId').isUUID(),
  body('scheduledFor').optional().isISO8601().withMessage('scheduledFor must be an ISO 8601 date'),
  body('description').optional().isString().isLength({ max: 2000 }),
];

export const listMineQuerySchema = [
  query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']),
];

export const updateRequestStatusSchema = [
  param('id').isUUID(),
  body('status').isIn(['accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status transition'),
];

export const createReviewSchema = [
  body('workerId').isUUID(),
  body('requestId').isUUID().withMessage('requestId is required — reviews must reference a completed request'),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 1000 }),
];

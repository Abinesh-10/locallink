import { body, query, param } from 'express-validator';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['low', 'normal', 'urgent', 'critical'];
const REQUEST_TYPES = ['blood', 'volunteer', 'emergency', 'medical', 'other'];

export const createRequestSchema = [
  body('type').isIn(REQUEST_TYPES).withMessage(`type must be one of: ${REQUEST_TYPES.join(', ')}`),
  body('urgency').optional().isIn(URGENCY_LEVELS).withMessage(`urgency must be one of: ${URGENCY_LEVELS.join(', ')}`),
  body('bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage(`bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}`),
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('contactVisible').optional().isBoolean(),
  body('expiresAt').optional().isISO8601(),
];

export const requestIdParamSchema = [param('id').isUUID()];

export const listRequestsSchema = [
  query('type').optional().isIn(REQUEST_TYPES),
  query('urgency').optional().isIn(URGENCY_LEVELS),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const respondSchema = [param('id').isUUID(), body('message').optional().isString().isLength({ max: 1000 })];

export const sosSchema = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat is required for SOS'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng is required for SOS'),
  body('description').optional().isString().isLength({ max: 500 }),
];

export const volunteersQuerySchema = [
  query('lat').isFloat({ min: -90, max: 90 }),
  query('lng').isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']),
];

export const createLostFoundSchema = [
  body('kind').isIn(['lost', 'found']).withMessage('kind must be lost or found'),
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('photos').optional().isArray({ max: 6 }),
  body('photos.*').optional().isURL(),
  body('lastSeenLat').optional().isFloat({ min: -90, max: 90 }),
  body('lastSeenLng').optional().isFloat({ min: -180, max: 180 }),
  body('lastSeenAt').optional().isISO8601(),
];

export const updateLostFoundSchema = createLostFoundSchema.map((chain) => chain.optional());

export const lostFoundIdParamSchema = [param('id').isUUID()];

export const listLostFoundSchema = [
  query('kind').optional().isIn(['lost', 'found']),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']),
];

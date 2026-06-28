import { body, query, param } from 'express-validator';

export const createListingSchema = [
  body('categoryId').isUUID().withMessage('categoryId must reference a valid rental category'),
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('dailyRate').optional().isFloat({ min: 0 }),
  body('weeklyRate').optional().isFloat({ min: 0 }),
  body('deposit').optional().isFloat({ min: 0 }),
  body('deliveryOption').optional().isIn(['pickup', 'delivery', 'both']),
  body('photos').optional().isArray({ max: 6 }),
  body('photos.*').optional().isURL(),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

export const updateListingSchema = createListingSchema.map((chain) => chain.optional());

export const listingIdParamSchema = [param('id').isUUID()];

export const searchListingsSchema = [
  query('category').optional().isUUID(),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']),
  query('verified').optional().isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const availabilityQuerySchema = [param('id').isUUID()];

export const createBookingSchema = [
  body('listingId').isUUID(),
  body('startDate').isISO8601().withMessage('startDate must be an ISO 8601 date'),
  body('endDate').isISO8601().withMessage('endDate must be an ISO 8601 date'),
  body('totalAmount').optional().isFloat({ min: 0 }),
];

export const updateBookingStatusSchema = [
  param('id').isUUID(),
  body('status').isIn(['confirmed', 'declined', 'returned', 'cancelled']).withMessage('Invalid status transition'),
];

export const createRentalReviewSchema = [
  body('listingId').isUUID(),
  body('bookingId').isUUID().withMessage('bookingId is required — reviews must reference a returned booking'),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 1000 }),
];

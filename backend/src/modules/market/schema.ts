import { body, query, param } from 'express-validator';

export const createListingSchema = [
  body('categoryId').optional().isUUID().withMessage('categoryId must reference a valid product category'),
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('price').isFloat({ min: 0 }).withMessage('price must be ≥ 0'),
  body('condition').isIn(['new', 'like_new', 'used', 'refurbished']).withMessage('Invalid condition'),
  body('qty').optional().isInt({ min: 0 }),
  body('photos').optional().isArray({ max: 8 }),
  body('photos.*').optional().isURL(),
  body('deliveryOption').optional().isIn(['pickup', 'local_delivery', 'both']),
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
  query('condition').optional().isIn(['new', 'like_new', 'used', 'refurbished']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const createOrderSchema = [
  body('productId').isUUID(),
  body('qty').optional().isInt({ min: 1 }),
  body('message').optional().isString().isLength({ max: 1000 }),
];

export const updateOrderStatusSchema = [
  param('id').isUUID(),
  body('status').isIn(['accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status transition'),
];

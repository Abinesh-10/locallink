import { body, query, param } from 'express-validator';

export const createTrainerProfileSchema = [
  body('subjects').optional().isArray({ max: 20 }),
  body('subjects.*').optional().isString().isLength({ max: 60 }),
  body('qualifications').optional().isString().isLength({ max: 2000 }),
  body('bio').optional().isString().isLength({ max: 2000 }),
];

export const updateTrainerProfileSchema = createTrainerProfileSchema.map((chain) => chain.optional());

export const createCourseSchema = [
  body('subject').isString().isLength({ min: 1, max: 120 }),
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('mode').isIn(['online', 'offline', 'hybrid']).withMessage('mode must be online, offline, or hybrid'),
  body('language').optional().isString().isLength({ max: 60 }),
  body('price').optional().isFloat({ min: 0 }),
  body('capacity').isInt({ min: 1 }).withMessage('capacity must be at least 1'),
  body('schedule').optional().isObject(),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

export const updateCourseSchema = createCourseSchema.map((chain) => chain.optional());

export const courseIdParamSchema = [param('id').isUUID()];

export const searchCoursesSchema = [
  query('subject').optional().isString(),
  query('mode').optional().isIn(['online', 'offline', 'hybrid']),
  query('lat').optional().isFloat({ min: -90, max: 90 }),
  query('lng').optional().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isIn(['5', '10', '15', '25']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

export const createEnrollmentSchema = [body('courseId').isUUID()];

export const updateEnrollmentStatusSchema = [
  param('id').isUUID(),
  body('status').isIn(['confirmed', 'cancelled', 'completed']).withMessage('Invalid status transition'),
];

export const createCourseReviewSchema = [
  body('courseId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 1000 }),
];

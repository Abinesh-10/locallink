import { body, param, query } from 'express-validator';

export const startChatSchema = [body('otherUserId').isUUID().withMessage('otherUserId is required')];

export const roomIdParamSchema = [param('roomId').isUUID()];

export const listMessagesSchema = [
  param('roomId').isUUID(),
  query('cursor').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const sendMessageSchema = [
  param('roomId').isUUID(),
  body('type').optional().isIn(['text', 'image', 'location']),
  body('body').isString().isLength({ min: 1, max: 5000 }),
];

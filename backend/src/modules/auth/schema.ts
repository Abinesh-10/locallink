import { body } from 'express-validator';

// E.164: + followed by 8–15 digits
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export const phoneSendOtpSchema = [
  body('phone').matches(PHONE_REGEX).withMessage('Phone must be in E.164 format, e.g. +919876543210'),
  body('purpose').optional().isIn(['login', 'verify']).withMessage('purpose must be login or verify'),
];

export const phoneVerifyOtpSchema = [
  body('phone').matches(PHONE_REGEX),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
  body('purpose').optional().isIn(['login', 'verify']),
  body('fullName').optional().isString().isLength({ min: 1, max: 120 }),
];

export const emailRegisterSchema = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
  body('fullName').isString().isLength({ min: 1, max: 120 }),
];

export const emailVerifyOtpSchema = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
];

export const emailResendOtpSchema = [body('email').isEmail().normalizeEmail()];

export const emailLoginSchema = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

export const forgotPasswordSchema = [body('email').isEmail().normalizeEmail()];

export const resetPasswordSchema = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
    .withMessage('Password must be ≥8 chars with upper, lower, and a number'),
];

export const googleCallbackSchema = [body('code').optional().isString()];

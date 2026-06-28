import { Router } from 'express';
import * as controller from './controller';
import { validate } from '../../middleware/validate';
import { authRateLimiter, otpSendRateLimiter } from '../../middleware/rateLimit';
import {
  phoneSendOtpSchema,
  phoneVerifyOtpSchema,
  emailRegisterSchema,
  emailVerifyOtpSchema,
  emailResendOtpSchema,
  emailLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schema';

const router = Router();

// All /auth/* routes get the general auth rate limiter; OTP-send routes get
// the tighter otpSendRateLimiter on top, per doc security requirement.
router.use(authRateLimiter);

// Phone OTP (primary)
router.post('/phone/send-otp', otpSendRateLimiter, validate(phoneSendOtpSchema), controller.phoneSendOtp);
router.post('/phone/verify-otp', validate(phoneVerifyOtpSchema), controller.phoneVerifyOtp);

// Email + Password (secondary)
router.post('/email/register', validate(emailRegisterSchema), controller.emailRegister);
router.post('/email/verify-otp', validate(emailVerifyOtpSchema), controller.emailVerifyOtp);
router.post('/email/resend-otp', otpSendRateLimiter, validate(emailResendOtpSchema), controller.emailResendOtp);
router.post('/email/login', validate(emailLoginSchema), controller.emailLogin);

// Google OAuth 2.0 (tertiary)
router.get('/google', controller.googleStart);
router.get('/google/callback', controller.googleCallback);

// Forgot / reset password
router.post('/forgot-password', otpSendRateLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

// Session management
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

export default router;

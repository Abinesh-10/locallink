import rateLimit from 'express-rate-limit';
import { isProd } from '../config/env';

/** General auth endpoints (login, register): 10 requests / 15 min / IP in prod;
 *  relaxed in development so local testing doesn't trip the limiter. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { type: 'https://locallink.app/errors/rate_limited', title: 'rate_limited', status: 429, detail: 'Too many attempts. Please try again later.' },
});

/** OTP send endpoints: tighter limit to control MSG91/SMTP cost and abuse.
 *  5 / 15 min / IP in prod; relaxed in development. */
export const otpSendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { type: 'https://locallink.app/errors/rate_limited', title: 'rate_limited', status: 429, detail: 'Too many OTP requests. Please wait before retrying.' },
});

/** General API limiter applied app-wide as a baseline. 300 / 15 min / IP. */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Community post limiter: 3 / hour / USER (not IP), per doc security
 * requirement: "rate-limit posts (3/hour/user...)". Must run after
 * requireAuth so req.user.id is available — falls back to IP if somehow
 * unauthenticated, which should never happen given route ordering, but
 * avoids a crash if it does.
 */
export const communityPostRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  message: { type: 'https://locallink.app/errors/rate_limited', title: 'rate_limited', status: 429, detail: 'You can post up to 3 community requests per hour.' },
});

/**
 * SOS limiter: 1 / 30 min / USER, per doc: "1 SOS/30 min/user". Deliberately
 * separate from communityPostRateLimiter (different window/max and a
 * distinct, more urgent error message) even though SOS technically creates
 * a community_requests row too — conflating the two limiters would let an
 * abusive user's SOS attempts consume their regular post quota or vice
 * versa, which isn't the doc's intent.
 */
export const sosRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  message: { type: 'https://locallink.app/errors/rate_limited', title: 'rate_limited', status: 429, detail: 'You can only send one SOS alert every 30 minutes.' },
});

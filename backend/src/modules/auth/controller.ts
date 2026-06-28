import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { durationToMs } from '../../lib/jwt';
import * as authService from './service';
import { getGoogleAuthUrl } from '../../config/google-oauth';
import { ApiError } from '../../middleware/error';

function setRefreshCookie(res: Response, refreshToken: string, expiresAt: Date): void {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/' });
}

function clientMeta(req: Request): { userAgent?: string; ip?: string } {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

export async function phoneSendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, purpose } = req.body;
    await authService.sendPhoneOtp(phone, purpose || 'login');
    res.json({ success: true, message: 'OTP sent.' });
  } catch (err) {
    next(err);
  }
}

export async function phoneVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp, purpose, fullName } = req.body;
    const { userAgent, ip } = clientMeta(req);
    const result = await authService.verifyPhoneOtp(phone, otp, purpose || 'login', fullName, userAgent, ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ success: true, accessToken: result.accessToken, user: result.user, roles: result.roles });
  } catch (err) {
    next(err);
  }
}

export async function emailRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, fullName } = req.body;
    await authService.registerWithEmail(email, password, fullName);
    // Always generic — never reveals whether the account already existed.
    res.json({ success: true, message: 'If this email is new, a verification code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function emailVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    const { userAgent, ip } = clientMeta(req);
    const result = await authService.verifyEmailOtp(email, otp, userAgent, ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ success: true, accessToken: result.accessToken, user: result.user, roles: result.roles });
  } catch (err) {
    next(err);
  }
}

export async function emailResendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await authService.resendEmailOtp(email, 'verify');
    res.json({ success: true, message: 'If this account exists and is unverified, a new code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function emailLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const { userAgent, ip } = clientMeta(req);
    const result = await authService.loginWithEmail(email, password, userAgent, ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ success: true, accessToken: result.accessToken, user: result.user, roles: result.roles });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.json({ success: true, message: 'If this email exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword(email, otp, newPassword);
    res.json({ success: true, message: 'Password reset successful. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

export async function googleStart(_req: Request, res: Response) {
  res.redirect(getGoogleAuthUrl());
}

export async function googleCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      throw new ApiError(400, 'invalid_request', 'Missing authorization code from Google.');
    }
    const { userAgent, ip } = clientMeta(req);
    const result = await authService.loginWithGoogle(code, userAgent, ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    // Redirect to frontend with a short-lived access token in the URL fragment
    // (not query string, so it never lands in server logs / referrer headers).
    const redirectUrl = `${env.FRONTEND_OAUTH_REDIRECT_URL}#accessToken=${encodeURIComponent(result.accessToken)}`;
    res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
    if (!token) {
      throw new ApiError(401, 'unauthorized', 'No refresh token provided.');
    }
    const { userAgent, ip } = clientMeta(req);
    const result = await authService.refreshAccessToken(token, userAgent, ip);
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ success: true, accessToken: result.accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
    if (token) {
      await authService.logout(token);
    }
    clearRefreshCookie(res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

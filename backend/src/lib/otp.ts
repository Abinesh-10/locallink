import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/** Generates a numeric OTP of configured length, e.g. "483920". */
export function generateOtp(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < env.OTP_LENGTH; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

/** OTPs are hashed at rest, same as passwords — never store the raw code. */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000);
}

export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

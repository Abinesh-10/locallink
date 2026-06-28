import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    // We don't throw in dev for third-party keys (MSG91/Cloudinary/Google/KYC)
    // because Phase 1 must still boot locally without every provider configured.
    // OTPService / mailer / oauth clients each guard against missing keys at call time.
    return '';
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  DATABASE_URL: required('DATABASE_URL', 'postgresql://locallink:locallink@localhost:5432/locallink'),
  PG_SSL: process.env.PG_SSL === 'true',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME || 'll_refresh_token',

  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),

  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || '',
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'LCLLNK',
  MSG91_WEBHOOK_SECRET: process.env.MSG91_WEBHOOK_SECRET || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'LocalLink <no-reply@locallink.app>',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
  FRONTEND_OAUTH_REDIRECT_URL: process.env.FRONTEND_OAUTH_REDIRECT_URL || 'http://localhost:5173/auth/oauth-success',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  KYC_PROVIDER: process.env.KYC_PROVIDER || 'surepass',
  KYC_API_KEY: process.env.KYC_API_KEY || '',
  KYC_API_BASE_URL: process.env.KYC_API_BASE_URL || '',
  KYC_WEBHOOK_SECRET: process.env.KYC_WEBHOOK_SECRET || '',

  REDIS_URL: process.env.REDIS_URL || '',

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),
  OTP_TTL_MINUTES: parseInt(process.env.OTP_TTL_MINUTES || '10', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  OTP_LOCKOUT_MINUTES: parseInt(process.env.OTP_LOCKOUT_MINUTES || '15', 10),
};

export const isProd = env.NODE_ENV === 'production';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, withTransaction } from '../../config/db';
import { env } from '../../config/env';
import { ApiError } from '../../middleware/error';
import { generateOtp, hashOtp, compareOtp, otpExpiryDate, isOtpExpired } from '../../lib/otp';
import { sendOtpSms, isMsg91Configured } from '../../config/msg91';
import { sendMail, isMailerConfigured } from '../../config/mailer';
import { signAccessToken, signRefreshToken, verifyRefreshToken, durationToMs } from '../../lib/jwt';
import { exchangeCodeForProfile, GoogleProfile } from '../../config/google-oauth';
import { logger } from '../../lib/logger';

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  google_id: string | null;
  full_name: string;
  photo_url: string | null;
  preferred_language: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_suspended: boolean;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: Pick<UserRow, 'id' | 'email' | 'phone' | 'full_name' | 'photo_url' | 'preferred_language'>;
  roles: string[];
}

async function getRolesForUser(userId: string): Promise<string[]> {
  const res = await query<{ name: string }>(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return res.rows.map((r) => r.name);
}

async function assignDefaultRole(userId: string): Promise<void> {
  // Every signup gets the 'customer' role by default, per doc §2.
  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'customer'
     ON CONFLICT DO NOTHING`,
    [userId]
  );
}

async function issueTokenPair(userId: string, roles: string[], userAgent?: string, ip?: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
  const accessToken = signAccessToken({ sub: userId, roles });

  // Create the refresh_tokens row first so we have an id to embed for revocation lookups.
  const refreshExpiresAt = new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));
  const placeholderHash = crypto.randomUUID(); // replaced below once we know the signed token
  const inserted = await query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, placeholderHash, refreshExpiresAt, userAgent || null, ip || null]
  );
  const tokenId = inserted.rows[0].id;

  const refreshToken = signRefreshToken({ sub: userId, tokenId });
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query('UPDATE refresh_tokens SET token_hash = $1 WHERE id = $2', [tokenHash, tokenId]);

  return { accessToken, refreshToken, refreshExpiresAt };
}

function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    full_name: row.full_name,
    photo_url: row.photo_url,
    preferred_language: row.preferred_language,
  };
}

// ── Phone OTP ──────────────────────────────────────────────────────────

export async function sendPhoneOtp(phone: string, purpose: 'login' | 'verify' = 'login'): Promise<void> {
  // Lockout check: 5 attempts / 15 min window, per doc security requirement.
  const recentAttempts = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM phone_otps
     WHERE phone = $1 AND created_at > now() - interval '${env.OTP_LOCKOUT_MINUTES} minutes'`,
    [phone]
  );
  if (parseInt(recentAttempts.rows[0].count, 10) >= env.OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'otp_lockout', `Too many OTP requests for this number. Try again in ${env.OTP_LOCKOUT_MINUTES} minutes.`);
  }

  const otp = generateOtp();
  const codeHash = await hashOtp(otp);
  await query(
    `INSERT INTO phone_otps (phone, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [phone, codeHash, purpose, otpExpiryDate()]
  );

  const result = await sendOtpSms(phone, otp);
  if (!result.success && isMsg91Configured()) {
    // Only hard-fail if MSG91 is actually configured and still failed —
    // in dev-without-keys mode sendOtpSms already logged + returned success.
    throw new ApiError(502, 'sms_provider_error', 'Failed to send OTP SMS. Please try again.');
  }
  if (!isMsg91Configured()) {
    logger.info(`[DEV MODE] OTP for ${phone}: ${otp}`);
  }
}

export async function verifyPhoneOtp(
  phone: string,
  otp: string,
  purpose: 'login' | 'verify',
  fullName?: string,
  userAgent?: string,
  ip?: string
): Promise<AuthResult> {
  const otpRow = await query<{ id: string; code_hash: string; expires_at: Date; attempts: number; consumed_at: Date | null }>(
    `SELECT id, code_hash, expires_at, attempts, consumed_at FROM phone_otps
     WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [phone, purpose]
  );

  if (otpRow.rows.length === 0) {
    throw new ApiError(400, 'otp_not_found', 'No pending OTP for this phone number. Please request a new one.');
  }
  const record = otpRow.rows[0];

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'otp_lockout', 'Too many incorrect attempts. Please request a new OTP.');
  }
  if (isOtpExpired(record.expires_at)) {
    throw new ApiError(400, 'otp_expired', 'OTP has expired. Please request a new one.');
  }

  const valid = await compareOtp(otp, record.code_hash);
  if (!valid) {
    await query('UPDATE phone_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    throw new ApiError(400, 'otp_invalid', 'Incorrect OTP.');
  }

  await query('UPDATE phone_otps SET consumed_at = now() WHERE id = $1', [record.id]);

  // Find or create the user.
  let userRes = await query<UserRow>('SELECT * FROM users WHERE phone = $1', [phone]);
  let user: UserRow;
  if (userRes.rows.length === 0) {
    const created = await query<UserRow>(
      `INSERT INTO users (phone, full_name, is_phone_verified)
       VALUES ($1, $2, true) RETURNING *`,
      [phone, fullName || 'LocalLink User']
    );
    user = created.rows[0];
    await assignDefaultRole(user.id);
    await query(
      `INSERT INTO user_reputation (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );
  } else {
    user = userRes.rows[0];
    if (!user.is_phone_verified) {
      await query('UPDATE users SET is_phone_verified = true WHERE id = $1', [user.id]);
    }
  }

  if (user.is_suspended) {
    throw new ApiError(403, 'account_suspended', 'This account has been suspended.');
  }

  const roles = await getRolesForUser(user.id);
  const tokens = await issueTokenPair(user.id, roles, userAgent, ip);

  return { ...tokens, user: toPublicUser(user), roles };
}

// ── Email + Password ──────────────────────────────────────────────────

export async function registerWithEmail(email: string, password: string, fullName: string): Promise<void> {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    // Email-enumeration-safe: don't reveal whether the email already exists.
    // We still "succeed" the request shape, but send no new OTP to a
    // pre-existing verified account — only act if it's unverified.
    const row = await query<{ id: string; is_email_verified: boolean }>(
      'SELECT id, is_email_verified FROM users WHERE email = $1',
      [email]
    );
    if (row.rows[0].is_email_verified) {
      return; // Silently no-op; client always sees a generic success message.
    }
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  let userId: string;
  if (existing.rows.length === 0) {
    const created = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3) RETURNING id`,
      [email, passwordHash, fullName]
    );
    userId = created.rows[0].id;
    await assignDefaultRole(userId);
    await query(`INSERT INTO user_reputation (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
  } else {
    userId = existing.rows[0].id;
    await query('UPDATE users SET password_hash = $1, full_name = $2 WHERE id = $3', [passwordHash, fullName, userId]);
  }

  const otp = generateOtp();
  const codeHash = await hashOtp(otp);
  await query(
    `INSERT INTO email_otps (user_id, code_hash, purpose, expires_at) VALUES ($1, $2, 'verify', $3)`,
    [userId, codeHash, otpExpiryDate()]
  );

  if (!isMailerConfigured()) {
    logger.info(`[DEV MODE] Email verification OTP for ${email}: ${otp}`);
  }
  await sendMail(email, 'Verify your LocalLink account', `<p>Your verification code is <b>${otp}</b>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`);
}

export async function resendEmailOtp(email: string, purpose: 'verify' | 'reset' = 'verify'): Promise<void> {
  const userRes = await query<{ id: string; is_email_verified: boolean }>(
    'SELECT id, is_email_verified FROM users WHERE email = $1',
    [email]
  );
  // Email-enumeration-safe: always return success regardless of whether the account exists.
  if (userRes.rows.length === 0) return;
  if (purpose === 'verify' && userRes.rows[0].is_email_verified) return;

  const userId = userRes.rows[0].id;
  const otp = generateOtp();
  const codeHash = await hashOtp(otp);
  await query(
    `INSERT INTO email_otps (user_id, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, codeHash, purpose, otpExpiryDate()]
  );
  if (!isMailerConfigured()) {
    logger.info(`[DEV MODE] Email OTP (${purpose}) for ${email}: ${otp}`);
  }
  await sendMail(email, 'Your LocalLink verification code', `<p>Your code is <b>${otp}</b>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`);
}

export async function verifyEmailOtp(email: string, otp: string, userAgent?: string, ip?: string): Promise<AuthResult> {
  const userRes = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    throw new ApiError(400, 'invalid_request', 'Invalid email or OTP.');
  }
  const user = userRes.rows[0];

  const otpRes = await query<{ id: string; code_hash: string; expires_at: Date; attempts: number }>(
    `SELECT id, code_hash, expires_at, attempts FROM email_otps
     WHERE user_id = $1 AND purpose = 'verify' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );
  if (otpRes.rows.length === 0) {
    throw new ApiError(400, 'otp_not_found', 'No pending verification code. Please request a new one.');
  }
  const record = otpRes.rows[0];
  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'otp_lockout', 'Too many incorrect attempts. Please request a new code.');
  }
  if (isOtpExpired(record.expires_at)) {
    throw new ApiError(400, 'otp_expired', 'Code has expired. Please request a new one.');
  }
  const valid = await compareOtp(otp, record.code_hash);
  if (!valid) {
    await query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    throw new ApiError(400, 'otp_invalid', 'Incorrect verification code.');
  }
  await query('UPDATE email_otps SET consumed_at = now() WHERE id = $1', [record.id]);
  await query('UPDATE users SET is_email_verified = true WHERE id = $1', [user.id]);

  if (user.is_suspended) {
    throw new ApiError(403, 'account_suspended', 'This account has been suspended.');
  }

  const roles = await getRolesForUser(user.id);
  const tokens = await issueTokenPair(user.id, roles, userAgent, ip);
  return { ...tokens, user: toPublicUser({ ...user, is_email_verified: true }), roles };
}

export async function loginWithEmail(email: string, password: string, userAgent?: string, ip?: string): Promise<AuthResult> {
  const userRes = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  // Generic message regardless of which check fails — email-enumeration-safe.
  const genericError = () => new ApiError(401, 'invalid_credentials', 'Incorrect email or password.');

  if (userRes.rows.length === 0) throw genericError();
  const user = userRes.rows[0];
  if (!user.password_hash) throw genericError(); // Google-only account

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw genericError();

  if (!user.is_email_verified) {
    throw new ApiError(403, 'email_not_verified', 'Please verify your email before logging in.');
  }
  if (user.is_suspended) {
    throw new ApiError(403, 'account_suspended', 'This account has been suspended.');
  }

  const roles = await getRolesForUser(user.id);
  const tokens = await issueTokenPair(user.id, roles, userAgent, ip);
  return { ...tokens, user: toPublicUser(user), roles };
}

export async function forgotPassword(email: string): Promise<void> {
  await resendEmailOtp(email, 'reset');
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const userRes = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    throw new ApiError(400, 'invalid_request', 'Invalid email or code.');
  }
  const userId = userRes.rows[0].id;

  const otpRes = await query<{ id: string; code_hash: string; expires_at: Date; attempts: number }>(
    `SELECT id, code_hash, expires_at, attempts FROM email_otps
     WHERE user_id = $1 AND purpose = 'reset' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (otpRes.rows.length === 0) {
    throw new ApiError(400, 'otp_not_found', 'No pending reset code. Please request a new one.');
  }
  const record = otpRes.rows[0];
  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'otp_lockout', 'Too many incorrect attempts. Please request a new code.');
  }
  if (isOtpExpired(record.expires_at)) {
    throw new ApiError(400, 'otp_expired', 'Code has expired. Please request a new one.');
  }
  const valid = await compareOtp(otp, record.code_hash);
  if (!valid) {
    await query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    throw new ApiError(400, 'otp_invalid', 'Incorrect code.');
  }

  await withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await client.query('UPDATE email_otps SET consumed_at = now() WHERE id = $1', [record.id]);
    // Revoke all existing refresh tokens on password reset — forces re-login everywhere.
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  });
}

// ── Google OAuth ───────────────────────────────────────────────────────

export async function loginWithGoogle(code: string, userAgent?: string, ip?: string): Promise<AuthResult> {
  const profile: GoogleProfile = await exchangeCodeForProfile(code);

  let userRes = await query<UserRow>('SELECT * FROM users WHERE google_id = $1', [profile.googleId]);
  let user: UserRow;

  if (userRes.rows.length > 0) {
    user = userRes.rows[0];
  } else {
    // Check if an account with this email already exists (e.g. signed up via email+password)
    // and link Google to it rather than creating a duplicate.
    const byEmail = await query<UserRow>('SELECT * FROM users WHERE email = $1', [profile.email]);
    if (byEmail.rows.length > 0) {
      user = byEmail.rows[0];
      await query(
        'UPDATE users SET google_id = $1, is_email_verified = true, photo_url = COALESCE(photo_url, $2) WHERE id = $3',
        [profile.googleId, profile.photoUrl, user.id]
      );
      user.google_id = profile.googleId;
    } else {
      const created = await query<UserRow>(
        `INSERT INTO users (email, google_id, full_name, photo_url, is_email_verified)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [profile.email, profile.googleId, profile.fullName, profile.photoUrl, profile.emailVerified]
      );
      user = created.rows[0];
      await assignDefaultRole(user.id);
      await query(`INSERT INTO user_reputation (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
    }
  }

  if (user.is_suspended) {
    throw new ApiError(403, 'account_suspended', 'This account has been suspended.');
  }

  const roles = await getRolesForUser(user.id);
  const tokens = await issueTokenPair(user.id, roles, userAgent, ip);
  return { ...tokens, user: toPublicUser(user), roles };
}

// ── Refresh / Logout ──────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string, userAgent?: string, ip?: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'invalid_refresh_token', 'Refresh token is invalid or expired.');
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const tokenRes = await query<{ id: string; revoked_at: Date | null; expires_at: Date }>(
    'SELECT id, revoked_at, expires_at FROM refresh_tokens WHERE id = $1 AND token_hash = $2',
    [payload.tokenId, tokenHash]
  );

  if (tokenRes.rows.length === 0 || tokenRes.rows[0].revoked_at) {
    throw new ApiError(401, 'invalid_refresh_token', 'Refresh token has been revoked.');
  }
  if (new Date() > new Date(tokenRes.rows[0].expires_at)) {
    throw new ApiError(401, 'invalid_refresh_token', 'Refresh token has expired.');
  }

  // Rotate: revoke the old token, issue a brand new pair.
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [tokenRes.rows[0].id]);

  const roles = await getRolesForUser(payload.sub);
  return issueTokenPair(payload.sub, roles, userAgent, ip);
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [payload.tokenId]);
  } catch {
    // Token already invalid/expired — logout is a no-op success either way.
  }
}

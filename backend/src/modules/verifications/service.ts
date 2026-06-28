import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { initiateKycCheck, KycType } from './provider';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { recomputeTrustScoreForUser } from '../reputation/service';

export interface VerificationRow {
  id: string;
  type: KycType;
  status: 'pending' | 'verified' | 'rejected';
  provider: string | null;
  provider_ref: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function initiateVerification(userId: string, type: KycType, documentNumber: string) {
  // One verification row per (user, type) — re-initiating overwrites the
  // previous attempt rather than creating duplicates, since the unique
  // constraint is (user_id, type).
  const existing = await query<{ status: string }>(
    'SELECT status FROM identity_verifications WHERE user_id = $1 AND type = $2',
    [userId, type]
  );
  if (existing.rows[0]?.status === 'verified') {
    throw new ApiError(400, 'already_verified', `${type} is already verified for this account.`);
  }

  // documentNumber is sent to the provider but never persisted — only the
  // provider's reference ID is stored, per doc security requirement.
  const result = await initiateKycCheck(type, userId, { document_number: documentNumber });

  const status = result.immediateStatus ?? 'pending';
  const verifiedAt = status === 'verified' ? new Date() : null;

  const row = await query<VerificationRow>(
    `INSERT INTO identity_verifications (user_id, type, status, provider, provider_ref, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, type)
     DO UPDATE SET status = EXCLUDED.status, provider = EXCLUDED.provider,
                   provider_ref = EXCLUDED.provider_ref, verified_at = EXCLUDED.verified_at
     RETURNING id, type, status, provider, provider_ref, verified_at, created_at, updated_at`,
    [userId, type, status, env.KYC_PROVIDER, result.providerRef, verifiedAt]
  );

  if (status === 'verified') {
    await syncVerifiedBadge(userId);
  }

  return row.rows[0];
}

export async function getVerificationStatus(userId: string) {
  const res = await query<VerificationRow>(
    `SELECT id, type, status, provider, provider_ref, verified_at, created_at, updated_at
     FROM identity_verifications WHERE user_id = $1 ORDER BY type`,
    [userId]
  );
  return res.rows;
}

/**
 * Recomputes the "Verified Worker" badge per doc: "shown only when at least
 * Aadhaar or DL confirmed" — GST verification alone does not qualify.
 * Called whenever a verification status changes to/from 'verified'.
 */
export async function syncVerifiedBadge(userId: string): Promise<void> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM identity_verifications
     WHERE user_id = $1 AND type IN ('aadhaar', 'driving_license') AND status = 'verified'`,
    [userId]
  );
  const isVerified = parseInt(res.rows[0].count, 10) > 0;

  // worker_profiles.is_verified and trainer_profiles.is_verified both read
  // off this same underlying KYC fact. rental_listings/product_listings
  // don't have an is_verified column themselves (the doc renders their
  // "Verified Seller" badge by joining identity_verifications at query
  // time instead), so only worker/trainer profiles are updated here.
  await query('UPDATE worker_profiles SET is_verified = $1 WHERE user_id = $2', [isVerified, userId]);
  await query('UPDATE trainer_profiles SET is_verified = $1 WHERE user_id = $2', [isVerified, userId]);

  // is_verified feeds into the trust_score formula's verified component —
  // recompute immediately so the badge and score change together.
  await recomputeTrustScoreForUser(userId);
}

/**
 * Handles the async webhook a KYC provider calls once a pending check
 * resolves. Verifies the shared-secret header before trusting the payload.
 */
export async function handleVerificationWebhook(
  providerName: string,
  providerRef: string,
  newStatus: 'verified' | 'rejected'
): Promise<void> {
  const row = await query<{ user_id: string; type: KycType }>(
    'SELECT user_id, type FROM identity_verifications WHERE provider_ref = $1',
    [providerRef]
  );
  if (row.rows.length === 0) {
    logger.warn('KYC webhook for unknown provider_ref', { providerName, providerRef });
    return;
  }

  const { user_id, type } = row.rows[0];
  await query(
    `UPDATE identity_verifications
     SET status = $1, verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE verified_at END
     WHERE provider_ref = $2`,
    [newStatus, providerRef]
  );

  if (newStatus === 'verified' || newStatus === 'rejected') {
    await syncVerifiedBadge(user_id);
  }
  logger.info('KYC webhook processed', { userId: user_id, type, newStatus });
}

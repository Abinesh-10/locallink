/**
 * Composite trust score, per doc §3:
 *   trust_score = (rating_avg * 0.4) + (completion_rate * 0.3)
 *               + (response_rate * 0.2) + (is_verified * 0.1) * 100
 *
 * Not called anywhere in Phase 1 (no reviews/requests exist yet), but
 * defined now so the formula lives in one place before Phase 2's DB
 * triggers and reputation module depend on it.
 */
export interface TrustScoreInput {
  ratingAvg: number; // 0–5
  completionRatePct: number; // 0–100
  responseRatePct: number; // 0–100
  isVerified: boolean;
}

export function computeTrustScore(input: TrustScoreInput): number {
  const ratingComponent = (input.ratingAvg / 5) * 0.4;
  const completionComponent = (input.completionRatePct / 100) * 0.3;
  const responseComponent = (input.responseRatePct / 100) * 0.2;
  const verifiedComponent = (input.isVerified ? 1 : 0) * 0.1;
  const score = (ratingComponent + completionComponent + responseComponent + verifiedComponent) * 100;
  return Math.round(score * 100) / 100; // 2 decimal places
}

export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export function trustTierFromScore(score: number): TrustTier {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

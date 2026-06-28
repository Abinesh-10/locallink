import { query, withTransaction } from '../../config/db';
import { computeTrustScore, trustTierFromScore } from '../../lib/trust-score';
import { PoolClient } from 'pg';

export interface ReputationRow {
  user_id: string;
  rating_avg: string;
  rating_count: number;
  completed_jobs: number;
  response_time_avg_minutes: number | null;
  response_rate_pct: number | null;
  trust_score: string;
  tier: string;
  updated_at: string;
}

export async function getReputation(userId: string): Promise<ReputationRow | null> {
  const res = await query<ReputationRow>('SELECT * FROM user_reputation WHERE user_id = $1', [userId]);
  return res.rows[0] ?? null;
}

/**
 * Recalculates and persists trust_score + tier from the current
 * rating_avg/completed_jobs/response_rate_pct columns. Call this any time
 * one of those inputs changes (review insert already updates rating_avg
 * via DB trigger — see migration 0010 — but trust_score itself isn't
 * recomputed there, so callers must invoke this afterward).
 */
async function recomputeTrustScore(userId: string, client: PoolClient): Promise<void> {
  const repRes = await client.query(
    `SELECT rating_avg, completed_jobs, response_rate_pct FROM user_reputation WHERE user_id = $1`,
    [userId]
  );
  if (repRes.rows.length === 0) return;
  const rep = repRes.rows[0];

  const verifiedRes = await client.query(`SELECT is_verified FROM worker_profiles WHERE user_id = $1`, [userId]);
  const isVerified = verifiedRes.rows[0]?.is_verified ?? false;

  // Note: "completion rate" in the trust-score formula is conceptually
  // completed/(completed+cancelled), but the doc's schema only tracks a
  // raw completed_jobs counter with no denominator of attempted jobs other
  // than service_requests itself. We approximate completion rate from
  // service_requests directly (completed vs accepted-or-completed) so the
  // formula has a real rate rather than a constant.
  const completionRes = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed')::float AS completed,
       COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled'))::float AS finished
     FROM service_requests WHERE worker_id = $1`,
    [userId]
  );
  const completed = completionRes.rows[0]?.completed ?? 0;
  const finished = completionRes.rows[0]?.finished ?? 0;
  const completionRatePct = finished > 0 ? (completed / finished) * 100 : 0;

  const trustScore = computeTrustScore({
    ratingAvg: parseFloat(rep.rating_avg) || 0,
    completionRatePct,
    responseRatePct: rep.response_rate_pct ?? 0,
    isVerified,
  });
  const tier = trustTierFromScore(trustScore);

  await client.query('UPDATE user_reputation SET trust_score = $1, tier = $2 WHERE user_id = $3', [
    trustScore,
    tier,
    userId,
  ]);
}

/**
 * Increments completed_jobs and recomputes trust_score when a service
 * request transitions to 'completed'. Called from the hire module's
 * service-request status-update handler.
 */
export async function recordJobCompletion(workerId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`UPDATE user_reputation SET completed_jobs = completed_jobs + 1 WHERE user_id = $1`, [
      workerId,
    ]);
    await recomputeTrustScore(workerId, client);
  });
}

/**
 * Updates response_rate_pct and response_time_avg_minutes based on how the
 * worker has handled their requests, then recomputes trust_score. Called
 * after every status transition on a service request.
 */
export async function recordResponseEvent(workerId: string): Promise<void> {
  await withTransaction(async (client) => {
    const stats = await client.query<{ total: string; responded: string; avg_minutes: string | null }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status IN ('accepted', 'declined', 'completed'))::text AS responded,
         AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60)
           FILTER (WHERE status IN ('accepted', 'declined', 'completed'))::text AS avg_minutes
       FROM service_requests
       WHERE worker_id = $1`,
      [workerId]
    );

    const total = parseInt(stats.rows[0].total, 10);
    const responded = parseInt(stats.rows[0].responded, 10);
    const responseRatePct = total > 0 ? Math.round((responded / total) * 100) : 0;
    const avgMinutes = stats.rows[0].avg_minutes ? Math.round(parseFloat(stats.rows[0].avg_minutes)) : null;

    await client.query(
      `UPDATE user_reputation SET response_rate_pct = $1, response_time_avg_minutes = $2 WHERE user_id = $3`,
      [responseRatePct, avgMinutes, workerId]
    );
    await recomputeTrustScore(workerId, client);
  });
}

/** Called by the verifications module after a badge changes, so trust_score's verified component updates immediately. */
export async function recomputeTrustScoreForUser(userId: string): Promise<void> {
  await withTransaction(async (client) => {
    await recomputeTrustScore(userId, client);
  });
}

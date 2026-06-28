import { query, withTransaction } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { recordJobCompletion, recordResponseEvent } from '../reputation/service';

// ── Worker Profiles ──────────────────────────────────────────────────

export interface CreateWorkerProfileInput {
  categoryId: string;
  subSkills?: string[];
  experienceYears?: number;
  hourlyRate?: number;
  dayRate?: number;
  bio?: string;
  portfolioUrls?: string[];
  isAvailable?: boolean;
}

export async function createOrUpdateWorkerProfile(userId: string, input: CreateWorkerProfileInput) {
  const categoryRes = await query('SELECT id FROM service_categories WHERE id = $1', [input.categoryId]);
  if (categoryRes.rows.length === 0) {
    throw new ApiError(400, 'invalid_category', 'Unknown service category.');
  }

  const result = await query(
    `INSERT INTO worker_profiles (user_id, category_id, sub_skills, experience_years, hourly_rate, day_rate, bio, portfolio_urls, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
     ON CONFLICT (user_id) DO UPDATE SET
       category_id = EXCLUDED.category_id,
       sub_skills = EXCLUDED.sub_skills,
       experience_years = EXCLUDED.experience_years,
       hourly_rate = EXCLUDED.hourly_rate,
       day_rate = EXCLUDED.day_rate,
       bio = EXCLUDED.bio,
       portfolio_urls = EXCLUDED.portfolio_urls,
       is_available = EXCLUDED.is_available
     RETURNING *`,
    [
      userId,
      input.categoryId,
      input.subSkills ?? [],
      input.experienceYears ?? null,
      input.hourlyRate ?? null,
      input.dayRate ?? null,
      input.bio ?? null,
      input.portfolioUrls ?? [],
      input.isAvailable,
    ]
  );

  // Creating a worker profile implies the 'worker' role, if not already held.
  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'worker'
     ON CONFLICT DO NOTHING`,
    [userId]
  );

  // user_reputation row should already exist from signup (Phase 1), but
  // guard defensively in case a pre-Phase-2 account never got one.
  await query('INSERT INTO user_reputation (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

  return result.rows[0];
}

export async function patchWorkerProfile(userId: string, input: Partial<CreateWorkerProfileInput>) {
  const existing = await query('SELECT * FROM worker_profiles WHERE user_id = $1', [userId]);
  if (existing.rows.length === 0) {
    throw new ApiError(404, 'not_found', 'No worker profile exists yet. Create one first.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    category_id: input.categoryId,
    sub_skills: input.subSkills,
    experience_years: input.experienceYears,
    hourly_rate: input.hourlyRate,
    day_rate: input.dayRate,
    bio: input.bio,
    portfolio_urls: input.portfolioUrls,
    is_available: input.isAvailable,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) return existing.rows[0];

  values.push(userId);
  const result = await query(`UPDATE worker_profiles SET ${sets.join(', ')} WHERE user_id = $${i} RETURNING *`, values);
  return result.rows[0];
}

export async function getWorkerByUserId(userId: string) {
  const res = await query(
    `SELECT wp.*, u.full_name, u.photo_url, u.phone, u.lat, u.lng, u.address,
            sc.slug AS category_slug, sc.name_en AS category_name_en,
            ur.trust_score, ur.tier, ur.completed_jobs, ur.response_rate_pct
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     LEFT JOIN service_categories sc ON sc.id = wp.category_id
     LEFT JOIN user_reputation ur ON ur.user_id = wp.user_id
     WHERE wp.user_id = $1`,
    [userId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Worker not found.');
  return res.rows[0];
}

export interface SearchWorkersParams {
  category?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  sort: 'distance' | 'rating' | 'trust';
  page: number;
  limit: number;
}

export async function searchWorkers(params: SearchWorkersParams) {
  const { category, lat, lng, radiusKm, minRating, verifiedOnly, sort, page, limit } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ['wp.is_available = true'];
  const values: any[] = [];
  let i = 1;

  if (category) {
    conditions.push(`wp.category_id = $${i++}`);
    values.push(category);
  }
  if (minRating !== undefined) {
    conditions.push(`wp.rating_avg >= $${i++}`);
    values.push(minRating);
  }
  if (verifiedOnly) {
    conditions.push(`wp.is_verified = true`);
  }
  let latParam = '', lngParam = '';
  if (hasGeo) {
    values.push(lat, lng);
    latParam = `$${i++}`;
    lngParam = `$${i++}`;
  }

  if (hasGeo && radiusKm) {
    // earth_box/earth_distance from the earthdistance+cube extensions
    // (enabled in migration 0001), using the GiST index on users(lat,lng).
    // latParam/lngParam are reused here and in distanceSelect below —
    // bound once, referenced twice, rather than duplicated in `values`.
    conditions.push(
      `earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(u.lat, u.lng)
       AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(u.lat, u.lng)) <= $${i} * 1000`
    );
    values.push(radiusKm);
    i += 1;
  }

  const distanceSelect = hasGeo
    ? `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(u.lat, u.lng)) / 1000.0 AS distance_km`
    : `NULL AS distance_km`;

  let orderBy = 'wp.rating_avg DESC';
  if (sort === 'distance' && hasGeo) orderBy = 'distance_km ASC';
  else if (sort === 'trust') orderBy = 'ur.trust_score DESC';
  else if (sort === 'rating') orderBy = 'wp.rating_avg DESC';

  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const sql = `
    SELECT wp.id, wp.user_id, wp.category_id, wp.sub_skills, wp.experience_years,
           wp.hourly_rate, wp.day_rate, wp.bio, wp.portfolio_urls, wp.is_available,
           wp.is_verified, wp.rating_avg, wp.rating_count,
           u.full_name, u.photo_url, u.address,
           sc.slug AS category_slug, sc.name_en AS category_name_en,
           ur.trust_score, ur.tier, ur.completed_jobs, ur.response_rate_pct,
           ${distanceSelect}
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON sc.id = wp.category_id
    LEFT JOIN user_reputation ur ON ur.user_id = wp.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i++}
  `;

  const result = await query(sql, values);
  return result.rows;
}

// ── Service Requests ─────────────────────────────────────────────────

export async function createServiceRequest(
  customerId: string,
  workerId: string,
  scheduledFor: string | undefined,
  description: string | undefined
) {
  if (customerId === workerId) {
    throw new ApiError(400, 'invalid_request', 'You cannot request service from yourself.');
  }
  const workerExists = await query('SELECT user_id FROM worker_profiles WHERE user_id = $1', [workerId]);
  if (workerExists.rows.length === 0) {
    throw new ApiError(404, 'not_found', 'Worker profile not found.');
  }

  const result = await query(
    `INSERT INTO service_requests (customer_id, worker_id, scheduled_for, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [customerId, workerId, scheduledFor ?? null, description ?? null]
  );
  return result.rows[0];
}

export async function listMyRequestsAsCustomer(customerId: string, status?: string) {
  const conditions = ['sr.customer_id = $1'];
  const values: any[] = [customerId];
  if (status) {
    conditions.push('sr.status = $2');
    values.push(status);
  }
  const res = await query(
    `SELECT sr.*, u.full_name AS worker_name, u.photo_url AS worker_photo_url
     FROM service_requests sr
     JOIN users u ON u.id = sr.worker_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sr.created_at DESC`,
    values
  );
  return res.rows;
}

export async function listMyRequestsAsWorker(workerId: string, status?: string) {
  const conditions = ['sr.worker_id = $1'];
  const values: any[] = [workerId];
  if (status) {
    conditions.push('sr.status = $2');
    values.push(status);
  }
  const res = await query(
    `SELECT sr.*, u.full_name AS customer_name, u.photo_url AS customer_photo_url
     FROM service_requests sr
     JOIN users u ON u.id = sr.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sr.created_at DESC`,
    values
  );
  return res.rows;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'declined', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  declined: [],
  completed: [],
  cancelled: [],
};

export async function updateRequestStatus(requestId: string, actingUserId: string, newStatus: string) {
  const updatedRequest = await withTransaction(async (client) => {
    const reqRes = await client.query('SELECT * FROM service_requests WHERE id = $1 FOR UPDATE', [requestId]);
    if (reqRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Service request not found.');
    const request = reqRes.rows[0];

    const isWorker = request.worker_id === actingUserId;
    const isCustomer = request.customer_id === actingUserId;
    if (!isWorker && !isCustomer) {
      throw new ApiError(403, 'forbidden', 'You are not a participant in this request.');
    }
    // Only the worker can accept/decline/complete; cancellation is allowed by either party.
    if (['accepted', 'declined', 'completed'].includes(newStatus) && !isWorker) {
      throw new ApiError(403, 'forbidden', 'Only the worker can accept, decline, or complete a request.');
    }

    const allowed = VALID_TRANSITIONS[request.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(400, 'invalid_transition', `Cannot move request from '${request.status}' to '${newStatus}'.`);
    }

    const updated = await client.query('UPDATE service_requests SET status = $1 WHERE id = $2 RETURNING *', [
      newStatus,
      requestId,
    ]);
    return updated.rows[0];
  });

  // Reputation side-effects happen after the transaction commits, so a
  // reputation-update failure never rolls back the status change itself.
  await recordResponseEvent(updatedRequest.worker_id);
  if (newStatus === 'completed') {
    await recordJobCompletion(updatedRequest.worker_id);
  }
  return updatedRequest;
}

// ── Reviews (worker-scoped) ──────────────────────────────────────────

export async function createWorkerReview(
  reviewerId: string,
  workerId: string,
  requestId: string,
  rating: number,
  comment?: string
) {
  const reqRes = await query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
  if (reqRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Service request not found.');
  const request = reqRes.rows[0];

  if (request.customer_id !== reviewerId) {
    throw new ApiError(403, 'forbidden', 'Only the customer who made the request can leave a review.');
  }
  if (request.worker_id !== workerId) {
    throw new ApiError(400, 'invalid_request', 'workerId does not match this request.');
  }
  if (request.status !== 'completed') {
    throw new ApiError(400, 'request_not_completed', 'Reviews require a completed request, per platform policy.');
  }

  try {
    const result = await query(
      `INSERT INTO reviews (reviewer_id, target_type, target_id, request_ref, rating, comment)
       VALUES ($1, 'worker', $2, $3, $4, $5) RETURNING *`,
      [reviewerId, workerId, requestId, rating, comment ?? null]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'already_reviewed', 'You have already reviewed this request.');
    }
    throw err;
  }
}

export async function listWorkerReviews(workerId: string) {
  const res = await query(
    `SELECT r.*, u.full_name AS reviewer_name, u.photo_url AS reviewer_photo_url
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.target_type = 'worker' AND r.target_id = $1
     ORDER BY r.created_at DESC`,
    [workerId]
  );
  return res.rows;
}

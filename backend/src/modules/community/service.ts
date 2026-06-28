import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';

// ── Community Requests ───────────────────────────────────────────────

export interface CreateRequestInput {
  type: 'blood' | 'volunteer' | 'emergency' | 'medical' | 'other';
  urgency?: 'low' | 'normal' | 'urgent' | 'critical';
  bloodGroup?: string;
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  contactVisible?: boolean;
  expiresAt?: string;
}

export async function createRequest(requesterId: string, input: CreateRequestInput) {
  if (input.type === 'blood' && !input.bloodGroup) {
    throw new ApiError(400, 'invalid_request', 'bloodGroup is required for blood requests.');
  }

  if (input.urgency === 'critical') {
    const verifiedRes = await query(
      `SELECT 1 FROM identity_verifications
       WHERE user_id = $1 AND type IN ('aadhaar', 'driving_license') AND status = 'verified' LIMIT 1`,
      [requesterId]
    );
    if (verifiedRes.rows.length === 0) {
      throw new ApiError(403, 'verification_required', 'Critical urgency requests require a verified account (Aadhaar or Driving License).');
    }
  }

  const result = await query(
    `INSERT INTO community_requests (requester_id, type, urgency, blood_group, title, description, lat, lng, contact_visible, expires_at)
     VALUES ($1, $2, COALESCE($3, 'normal'), $4, $5, $6, $7, $8, COALESCE($9, true), $10)
     RETURNING *`,
    [
      requesterId,
      input.type,
      input.urgency,
      input.bloodGroup ?? null,
      input.title,
      input.description ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.contactVisible,
      input.expiresAt ?? null,
    ]
  );
  return result.rows[0];
}

export interface ListRequestsParams {
  type?: string;
  urgency?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page: number;
  limit: number;
}

export async function listRequests(params: ListRequestsParams) {
  const { type, urgency, lat, lng, radiusKm, page, limit } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ["cr.status = 'open'", '(cr.expires_at IS NULL OR cr.expires_at > now())'];
  const values: any[] = [];
  let i = 1;

  if (type) {
    conditions.push(`cr.type = $${i++}`);
    values.push(type);
  }
  if (urgency) {
    conditions.push(`cr.urgency = $${i++}`);
    values.push(urgency);
  }

  let latParam = '';
  let lngParam = '';
  if (hasGeo) {
    values.push(lat, lng);
    latParam = `$${i++}`;
    lngParam = `$${i++}`;
  }
  if (hasGeo && radiusKm) {
    conditions.push(
      `earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(cr.lat, cr.lng)
       AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(cr.lat, cr.lng)) <= $${i} * 1000`
    );
    values.push(radiusKm);
    i += 1;
  }

  const distanceSelect = hasGeo
    ? `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(cr.lat, cr.lng)) / 1000.0 AS distance_km`
    : `NULL AS distance_km`;

  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const sql = `
    SELECT cr.id, cr.requester_id, cr.type, cr.urgency, cr.blood_group, cr.title, cr.description,
           cr.lat, cr.lng, cr.contact_visible, cr.is_sos, cr.expires_at, cr.status, cr.created_at,
           u.full_name AS requester_name, u.photo_url AS requester_photo_url,
           CASE WHEN cr.contact_visible THEN u.phone ELSE NULL END AS requester_phone,
           (SELECT COUNT(*) FROM community_responses cres WHERE cres.request_id = cr.id) AS response_count,
           ${distanceSelect}
    FROM community_requests cr
    JOIN users u ON u.id = cr.requester_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY cr.is_sos DESC, cr.created_at DESC
    LIMIT $${i++} OFFSET $${i++}
  `;

  const result = await query(sql, values);
  return result.rows;
}

export async function getRequestById(requestId: string) {
  const res = await query(
    `SELECT cr.*, u.full_name AS requester_name, u.photo_url AS requester_photo_url,
            CASE WHEN cr.contact_visible THEN u.phone ELSE NULL END AS requester_phone,
            (SELECT COUNT(*) FROM community_responses cres WHERE cres.request_id = cr.id) AS response_count
     FROM community_requests cr
     JOIN users u ON u.id = cr.requester_id
     WHERE cr.id = $1`,
    [requestId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Request not found.');
  return res.rows[0];
}

export async function respondToRequest(requestId: string, responderId: string, message?: string) {
  const reqRes = await query('SELECT requester_id, status FROM community_requests WHERE id = $1', [requestId]);
  if (reqRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Request not found.');
  const request = reqRes.rows[0];

  if (request.requester_id === responderId) {
    throw new ApiError(400, 'invalid_request', 'You cannot respond to your own request.');
  }
  if (request.status !== 'open') {
    throw new ApiError(400, 'request_closed', 'This request has already been closed.');
  }

  try {
    const result = await query(
      `INSERT INTO community_responses (request_id, responder_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [requestId, responderId, message ?? null]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'already_responded', 'You have already responded to this request.');
    }
    throw err;
  }
}

export async function listResponses(requestId: string) {
  const res = await query(
    `SELECT cres.*, u.full_name AS responder_name, u.photo_url AS responder_photo_url, u.phone AS responder_phone
     FROM community_responses cres
     JOIN users u ON u.id = cres.responder_id
     WHERE cres.request_id = $1
     ORDER BY cres.created_at`,
    [requestId]
  );
  return res.rows;
}

export async function closeRequest(requestId: string, actingUserId: string) {
  const reqRes = await query('SELECT requester_id, status FROM community_requests WHERE id = $1', [requestId]);
  if (reqRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Request not found.');
  if (reqRes.rows[0].requester_id !== actingUserId) {
    throw new ApiError(403, 'forbidden', 'Only the requester can close this request.');
  }
  if (reqRes.rows[0].status === 'closed') {
    return reqRes.rows[0];
  }
  const result = await query(`UPDATE community_requests SET status = 'closed' WHERE id = $1 RETURNING *`, [requestId]);
  return result.rows[0];
}

// ── SOS ───────────────────────────────────────────────────────────────

export interface CreateSosInput {
  lat: number;
  lng: number;
  description?: string;
}

/**
 * Creates the underlying community_requests row for an SOS broadcast.
 * Per doc: type/urgency/contact are auto-prefilled ("critical urgency
 * community request automatically pre-filled with user's live GPS
 * location and phone number if phone-verified"), auto-expires after 2
 * hours, is_sos=true so it sorts to the top of the feed.
 *
 * This function only handles the DB write — the SMS fanout and Socket.IO
 * broadcast are orchestrated by the controller, since they're I/O
 * side-effects that shouldn't roll back the request creation if they fail
 * (a dropped SMS shouldn't undo a person's cry for help being recorded).
 */
export async function createSosRequest(requesterId: string, input: CreateSosInput) {
  const userRes = await query<{ full_name: string; phone: string | null; is_phone_verified: boolean }>(
    'SELECT full_name, phone, is_phone_verified FROM users WHERE id = $1',
    [requesterId]
  );
  if (userRes.rows.length === 0) throw new ApiError(404, 'not_found', 'User not found.');
  const user = userRes.rows[0];

  // Per doc: "phone-verified required for SOS".
  if (!user.is_phone_verified) {
    throw new ApiError(403, 'phone_verification_required', 'SOS requires a verified phone number on your account.');
  }

  const result = await query(
    `INSERT INTO community_requests (requester_id, type, urgency, title, description, lat, lng, contact_visible, is_sos, expires_at)
     VALUES ($1, 'emergency', 'critical', $2, $3, $4, $5, true, true, now() + interval '2 hours')
     RETURNING *`,
    [requesterId, `SOS — ${user.full_name} needs help`, input.description ?? null, input.lat, input.lng]
  );
  // Return the name directly rather than making the caller parse it back
  // out of the generated title string — that would be fragile if the
  // title format ever changes.
  return { ...result.rows[0], requesterName: user.full_name };
}

/** Returns emergency contacts so the controller can fan out SMS alerts. */
export async function getEmergencyContactsForSms(userId: string) {
  const res = await query<{ name: string; phone: string }>(
    'SELECT name, phone FROM emergency_contacts WHERE user_id = $1',
    [userId]
  );
  return res.rows;
}

/**
 * Returns the IDs of users within radiusKm of (lat, lng), excluding the
 * requester themselves, so the controller can fan out a Socket.IO
 * sos:alert to each of them. The location ping included in that event is
 * the SOS sender's own coordinates (already known to the controller from
 * the request body), not each recipient's — so this only needs to return
 * IDs, not coordinates.
 */
export async function getNearbyUserIds(lat: number, lng: number, radiusKm: number, excludeUserId: string) {
  const res = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE id != $4
       AND lat IS NOT NULL AND lng IS NOT NULL
       AND earth_box(ll_to_earth($1, $2), $3 * 1000) @> ll_to_earth(lat, lng)
       AND earth_distance(ll_to_earth($1, $2), ll_to_earth(lat, lng)) <= $3 * 1000`,
    [lat, lng, radiusKm, excludeUserId]
  );
  return res.rows.map((r) => r.id);
}

// ── Volunteers ────────────────────────────────────────────────────────

export async function getNearbyVolunteers(lat: number, lng: number, radiusKm: number) {
  const res = await query(
    `SELECT u.id, u.full_name, u.photo_url, u.phone,
            earth_distance(ll_to_earth($1, $2), ll_to_earth(u.lat, u.lng)) / 1000.0 AS distance_km
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'volunteer'
       AND u.lat IS NOT NULL AND u.lng IS NOT NULL
       AND earth_box(ll_to_earth($1, $2), $3 * 1000) @> ll_to_earth(u.lat, u.lng)
       AND earth_distance(ll_to_earth($1, $2), ll_to_earth(u.lat, u.lng)) <= $3 * 1000
     ORDER BY distance_km ASC`,
    [lat, lng, radiusKm]
  );
  return res.rows;
}

// ── Lost & Found ──────────────────────────────────────────────────────

export interface CreateLostFoundInput {
  kind: 'lost' | 'found';
  title: string;
  description?: string;
  photos?: string[];
  lastSeenLat?: number;
  lastSeenLng?: number;
  lastSeenAt?: string;
}

export async function createLostFound(userId: string, input: CreateLostFoundInput) {
  const result = await query(
    `INSERT INTO lost_and_found (user_id, kind, title, description, photos, last_seen_lat, last_seen_lng, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      input.kind,
      input.title,
      input.description ?? null,
      input.photos ?? [],
      input.lastSeenLat ?? null,
      input.lastSeenLng ?? null,
      input.lastSeenAt ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateLostFound(userId: string, itemId: string, input: Partial<CreateLostFoundInput>) {
  const existing = await query('SELECT user_id FROM lost_and_found WHERE id = $1', [itemId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Item not found.');
  if (existing.rows[0].user_id !== userId) {
    throw new ApiError(403, 'forbidden', 'Only the poster can update this item.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    kind: input.kind,
    title: input.title,
    description: input.description,
    photos: input.photos,
    last_seen_lat: input.lastSeenLat,
    last_seen_lng: input.lastSeenLng,
    last_seen_at: input.lastSeenAt,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) {
    const res = await query('SELECT * FROM lost_and_found WHERE id = $1', [itemId]);
    return res.rows[0];
  }

  values.push(itemId);
  const result = await query(`UPDATE lost_and_found SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return result.rows[0];
}

export async function markLostFoundResolved(userId: string, itemId: string) {
  const existing = await query('SELECT user_id FROM lost_and_found WHERE id = $1', [itemId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Item not found.');
  if (existing.rows[0].user_id !== userId) {
    throw new ApiError(403, 'forbidden', 'Only the poster can mark this item resolved.');
  }
  const result = await query(`UPDATE lost_and_found SET status = 'resolved' WHERE id = $1 RETURNING *`, [itemId]);
  return result.rows[0];
}

export async function deleteLostFound(userId: string, itemId: string) {
  const existing = await query('SELECT user_id FROM lost_and_found WHERE id = $1', [itemId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Item not found.');
  if (existing.rows[0].user_id !== userId) {
    throw new ApiError(403, 'forbidden', 'Only the poster can delete this item.');
  }
  await query('DELETE FROM lost_and_found WHERE id = $1', [itemId]);
}

export async function getLostFoundById(itemId: string) {
  const res = await query(
    `SELECT lf.*, u.full_name AS poster_name, u.photo_url AS poster_photo_url
     FROM lost_and_found lf
     JOIN users u ON u.id = lf.user_id
     WHERE lf.id = $1`,
    [itemId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Item not found.');
  return res.rows[0];
}

export interface ListLostFoundParams {
  kind?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export async function listLostFound(params: ListLostFoundParams) {
  const { kind, lat, lng, radiusKm } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ["lf.status = 'open'"];
  const values: any[] = [];
  let i = 1;

  if (kind) {
    conditions.push(`lf.kind = $${i++}`);
    values.push(kind);
  }

  let latParam = '';
  let lngParam = '';
  if (hasGeo) {
    values.push(lat, lng);
    latParam = `$${i++}`;
    lngParam = `$${i++}`;
  }
  if (hasGeo && radiusKm) {
    conditions.push(
      `earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(lf.last_seen_lat, lf.last_seen_lng)
       AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(lf.last_seen_lat, lf.last_seen_lng)) <= $${i} * 1000`
    );
    values.push(radiusKm);
    i += 1;
  }

  const sql = `
    SELECT lf.*, u.full_name AS poster_name, u.photo_url AS poster_photo_url
    FROM lost_and_found lf
    JOIN users u ON u.id = lf.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY lf.created_at DESC
  `;

  const result = await query(sql, values);
  return result.rows;
}

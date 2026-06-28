import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';

// ── Listings ──────────────────────────────────────────────────────────

export interface CreateListingInput {
  categoryId: string;
  title: string;
  description?: string;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  deposit?: number;
  deliveryOption?: 'pickup' | 'delivery' | 'both';
  photos?: string[];
  lat?: number;
  lng?: number;
}

export async function createListing(ownerId: string, input: CreateListingInput) {
  const categoryRes = await query('SELECT id FROM rental_categories WHERE id = $1', [input.categoryId]);
  if (categoryRes.rows.length === 0) {
    throw new ApiError(400, 'invalid_category', 'Unknown rental category.');
  }
  if (!input.hourlyRate && !input.dailyRate && !input.weeklyRate) {
    throw new ApiError(400, 'invalid_request', 'At least one of hourlyRate, dailyRate, or weeklyRate is required.');
  }

  const result = await query(
    `INSERT INTO rental_listings (owner_id, category_id, title, description, hourly_rate, daily_rate, weekly_rate, deposit, delivery_option, photos, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 0), COALESCE($9, 'pickup'), $10, $11, $12)
     RETURNING *`,
    [
      ownerId,
      input.categoryId,
      input.title,
      input.description ?? null,
      input.hourlyRate ?? null,
      input.dailyRate ?? null,
      input.weeklyRate ?? null,
      input.deposit,
      input.deliveryOption,
      input.photos ?? [],
      input.lat ?? null,
      input.lng ?? null,
    ]
  );

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'item_owner'
     ON CONFLICT DO NOTHING`,
    [ownerId]
  );

  return result.rows[0];
}

export async function updateListing(ownerId: string, listingId: string, input: Partial<CreateListingInput>) {
  const existing = await query('SELECT * FROM rental_listings WHERE id = $1', [listingId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  if (existing.rows[0].owner_id !== ownerId) {
    throw new ApiError(403, 'forbidden', 'Only the owner can update this listing.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    hourly_rate: input.hourlyRate,
    daily_rate: input.dailyRate,
    weekly_rate: input.weeklyRate,
    deposit: input.deposit,
    delivery_option: input.deliveryOption,
    photos: input.photos,
    lat: input.lat,
    lng: input.lng,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) return existing.rows[0];

  values.push(listingId);
  const result = await query(`UPDATE rental_listings SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return result.rows[0];
}

export async function deleteListing(ownerId: string, listingId: string) {
  const existing = await query('SELECT owner_id FROM rental_listings WHERE id = $1', [listingId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  if (existing.rows[0].owner_id !== ownerId) {
    throw new ApiError(403, 'forbidden', 'Only the owner can delete this listing.');
  }
  await query('DELETE FROM rental_listings WHERE id = $1', [listingId]);
}

export async function getListingById(listingId: string) {
  const res = await query(
    `SELECT rl.*, u.full_name AS owner_name, u.photo_url AS owner_photo_url,
            rc.slug AS category_slug, rc.names AS category_names,
            EXISTS (
              SELECT 1 FROM identity_verifications iv
              WHERE iv.user_id = rl.owner_id AND iv.type IN ('aadhaar', 'driving_license') AND iv.status = 'verified'
            ) AS is_verified_seller
     FROM rental_listings rl
     JOIN users u ON u.id = rl.owner_id
     LEFT JOIN rental_categories rc ON rc.id = rl.category_id
     WHERE rl.id = $1`,
    [listingId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  return res.rows[0];
}

export interface SearchListingsParams {
  category?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  verifiedOnly?: boolean;
  page: number;
  limit: number;
}

export async function searchListings(params: SearchListingsParams) {
  const { category, lat, lng, radiusKm, verifiedOnly, page, limit } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ['rl.is_active = true'];
  const values: any[] = [];
  let i = 1;

  if (category) {
    conditions.push(`rl.category_id = $${i++}`);
    values.push(category);
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
      `earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(rl.lat, rl.lng)
       AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(rl.lat, rl.lng)) <= $${i} * 1000`
    );
    values.push(radiusKm);
    i += 1;
  }
  if (verifiedOnly) {
    conditions.push(
      `EXISTS (SELECT 1 FROM identity_verifications iv WHERE iv.user_id = rl.owner_id AND iv.type IN ('aadhaar', 'driving_license') AND iv.status = 'verified')`
    );
  }

  const distanceSelect = hasGeo
    ? `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(rl.lat, rl.lng)) / 1000.0 AS distance_km`
    : `NULL AS distance_km`;

  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const sql = `
    SELECT rl.id, rl.owner_id, rl.category_id, rl.title, rl.hourly_rate, rl.daily_rate, rl.weekly_rate,
           rl.deposit, rl.delivery_option, rl.photos, rl.rating_avg, rl.rating_count,
           u.full_name AS owner_name, u.photo_url AS owner_photo_url,
           rc.slug AS category_slug, rc.names AS category_names,
           EXISTS (
             SELECT 1 FROM identity_verifications iv
             WHERE iv.user_id = rl.owner_id AND iv.type IN ('aadhaar', 'driving_license') AND iv.status = 'verified'
           ) AS is_verified_seller,
           ${distanceSelect}
    FROM rental_listings rl
    JOIN users u ON u.id = rl.owner_id
    LEFT JOIN rental_categories rc ON rc.id = rl.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${hasGeo ? 'distance_km ASC' : 'rl.created_at DESC'}
    LIMIT $${i++} OFFSET $${i++}
  `;

  const result = await query(sql, values);
  return result.rows;
}

export async function listMyListings(ownerId: string) {
  const res = await query('SELECT * FROM rental_listings WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return res.rows;
}

// ── Availability ──────────────────────────────────────────────────────

/**
 * Parses a raw Postgres tstzrange string (e.g. ["2026-06-20 10:00:00+00",
 * "2026-06-20 14:00:00+00")) into clean ISO start/end strings. pg does not
 * auto-parse range types, and pushing range-literal parsing onto the
 * frontend would duplicate this logic in two languages.
 */
function parsePeriod(period: string): { start: string | null; end: string | null } {
  const match = /[[(]"?([^",)]+)"?,\s*"?([^",)\]]+)"?[\])]/.exec(period);
  return {
    start: match ? new Date(match[1]).toISOString() : null,
    end: match ? new Date(match[2]).toISOString() : null,
  };
}

export async function getAvailability(listingId: string) {
  const res = await query<{ period: string; status: string }>(
    `SELECT period, status FROM rental_bookings
     WHERE listing_id = $1 AND status IN ('requested', 'confirmed')
     ORDER BY lower(period)`,
    [listingId]
  );
  return res.rows.map((row) => ({ status: row.status, ...parsePeriod(row.period) }));
}

// ── Bookings ──────────────────────────────────────────────────────────

export async function createBooking(
  renterId: string,
  listingId: string,
  startDate: string,
  endDate: string,
  totalAmount?: number
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    throw new ApiError(400, 'invalid_dates', 'endDate must be after startDate.');
  }

  const listingRes = await query('SELECT owner_id, is_active FROM rental_listings WHERE id = $1', [listingId]);
  if (listingRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Listing not found.');
  const listing = listingRes.rows[0];
  if (!listing.is_active) throw new ApiError(400, 'listing_inactive', 'This listing is no longer active.');
  if (listing.owner_id === renterId) {
    throw new ApiError(400, 'invalid_request', 'You cannot book your own listing.');
  }

  try {
    const result = await query(
      `INSERT INTO rental_bookings (listing_id, renter_id, period, total_amount)
       VALUES ($1, $2, tstzrange($3, $4, '[)'), $5)
       RETURNING *`,
      [listingId, renterId, start.toISOString(), end.toISOString(), totalAmount ?? null]
    );
    const { period, ...rest } = result.rows[0];
    // We already know start/end from the validated input — no need to
    // re-parse the raw range string the DB echoes back. ownerId is
    // included so the controller can fire a new-booking notification
    // without a redundant second lookup of the listing.
    return { ...rest, start: start.toISOString(), end: end.toISOString(), ownerId: listing.owner_id };
  } catch (err: any) {
    if (err.code === '23P01') {
      throw new ApiError(409, 'booking_conflict', 'This item is already booked for part of the selected period.');
    }
    throw err;
  }
}

export async function listMyBookingsAsRenter(renterId: string) {
  const res = await query(
    `SELECT rb.id, rb.listing_id, rb.renter_id, rb.period, rb.status, rb.total_amount, rb.created_at, rb.updated_at,
            rl.title AS listing_title, rl.photos AS listing_photos, u.full_name AS owner_name
     FROM rental_bookings rb
     JOIN rental_listings rl ON rl.id = rb.listing_id
     JOIN users u ON u.id = rl.owner_id
     WHERE rb.renter_id = $1
     ORDER BY rb.created_at DESC`,
    [renterId]
  );
  return res.rows.map((row) => {
    const { period, ...rest } = row;
    return { ...rest, ...parsePeriod(period) };
  });
}

export async function listBookingsForOwner(ownerId: string) {
  const res = await query(
    `SELECT rb.id, rb.listing_id, rb.renter_id, rb.period, rb.status, rb.total_amount, rb.created_at, rb.updated_at,
            rl.title AS listing_title, rl.photos AS listing_photos, u.full_name AS renter_name
     FROM rental_bookings rb
     JOIN rental_listings rl ON rl.id = rb.listing_id
     JOIN users u ON u.id = rb.renter_id
     WHERE rl.owner_id = $1
     ORDER BY rb.created_at DESC`,
    [ownerId]
  );
  return res.rows.map((row) => {
    const { period, ...rest } = row;
    return { ...rest, ...parsePeriod(period) };
  });
}

const VALID_BOOKING_TRANSITIONS: Record<string, string[]> = {
  requested: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['returned', 'cancelled'],
  declined: [],
  returned: [],
  cancelled: [],
};

export async function updateBookingStatus(bookingId: string, actingUserId: string, newStatus: string) {
  const bookingRes = await query(
    `SELECT rb.*, rl.owner_id FROM rental_bookings rb
     JOIN rental_listings rl ON rl.id = rb.listing_id
     WHERE rb.id = $1`,
    [bookingId]
  );
  if (bookingRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Booking not found.');
  const booking = bookingRes.rows[0];

  const isOwner = booking.owner_id === actingUserId;
  const isRenter = booking.renter_id === actingUserId;
  if (!isOwner && !isRenter) {
    throw new ApiError(403, 'forbidden', 'You are not a participant in this booking.');
  }
  if (['confirmed', 'declined', 'returned'].includes(newStatus) && !isOwner) {
    throw new ApiError(403, 'forbidden', 'Only the owner can confirm, decline, or mark a booking returned.');
  }

  const allowed = VALID_BOOKING_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, 'invalid_transition', `Cannot move booking from '${booking.status}' to '${newStatus}'.`);
  }

  const updated = await query('UPDATE rental_bookings SET status = $1 WHERE id = $2 RETURNING *', [
    newStatus,
    bookingId,
  ]);
  const { period, ...rest } = updated.rows[0];
  // ownerId comes from the earlier joined SELECT, not this UPDATE's
  // RETURNING * — rental_bookings itself has no owner_id column.
  return { ...rest, ...parsePeriod(period), ownerId: booking.owner_id };
}

// ── Reviews (rental-listing-scoped) ──────────────────────────────────

export async function createRentalReview(
  reviewerId: string,
  listingId: string,
  bookingId: string,
  rating: number,
  comment?: string
) {
  const bookingRes = await query('SELECT * FROM rental_bookings WHERE id = $1', [bookingId]);
  if (bookingRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Booking not found.');
  const booking = bookingRes.rows[0];

  if (booking.renter_id !== reviewerId) {
    throw new ApiError(403, 'forbidden', 'Only the renter can leave a review for this booking.');
  }
  if (booking.listing_id !== listingId) {
    throw new ApiError(400, 'invalid_request', 'listingId does not match this booking.');
  }
  if (booking.status !== 'returned') {
    throw new ApiError(400, 'booking_not_returned', 'Reviews require a returned booking, per platform policy.');
  }

  try {
    const result = await query(
      `INSERT INTO reviews (reviewer_id, target_type, target_id, request_ref, rating, comment)
       VALUES ($1, 'rental', $2, $3, $4, $5) RETURNING *`,
      [reviewerId, listingId, bookingId, rating, comment ?? null]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'already_reviewed', 'You have already reviewed this booking.');
    }
    throw err;
  }
}

export async function listListingReviews(listingId: string) {
  const res = await query(
    `SELECT r.*, u.full_name AS reviewer_name, u.photo_url AS reviewer_photo_url
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.target_type = 'rental' AND r.target_id = $1
     ORDER BY r.created_at DESC`,
    [listingId]
  );
  return res.rows;
}

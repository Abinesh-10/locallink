import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { syncVerifiedBadge } from '../verifications/service';

// ── Users ────────────────────────────────────────────────────────────

export interface ListUsersParams {
  search?: string;
  suspended?: boolean;
  page: number;
  limit: number;
}

export async function listUsers(params: ListUsersParams) {
  const { search, suspended, page, limit } = params;
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (search) {
    conditions.push(`(full_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`);
    values.push(`%${search}%`);
    i += 1;
  }
  if (suspended !== undefined) {
    conditions.push(`is_suspended = $${i++}`);
    values.push(suspended);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const res = await query(
    `SELECT id, email, phone, full_name, photo_url, is_email_verified, is_phone_verified,
            is_suspended, created_at,
            (SELECT array_agg(r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = users.id) AS roles
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    values
  );
  return res.rows;
}

export async function getUserById(userId: string) {
  const res = await query(
    `SELECT id, email, phone, full_name, photo_url, is_email_verified, is_phone_verified,
            is_suspended, created_at,
            (SELECT array_agg(r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = users.id) AS roles
     FROM users WHERE id = $1`,
    [userId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'User not found.');
  return res.rows[0];
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  const result = await query('UPDATE users SET is_suspended = $1 WHERE id = $2 RETURNING id, full_name, is_suspended', [
    suspended,
    userId,
  ]);
  if (result.rows.length === 0) throw new ApiError(404, 'not_found', 'User not found.');
  return result.rows[0];
}

// ── Verification badge management (worker/rental/product/trainer) ────

/**
 * Per doc: "worker/seller/trainer verification badge management". Note
 * rental and product listings don't store an is_verified column at all —
 * their "Verified Seller" badge is always computed live via an EXISTS
 * join against identity_verifications (see hire/rent/market services),
 * so there's nothing for an admin to directly toggle on those two types.
 * Only worker_profiles and trainer_profiles have a real is_verified column
 * an admin override can touch.
 */
export async function setProfileVerified(type: string, profileUserId: string, verified: boolean) {
  if (type === 'rental' || type === 'product') {
    throw new ApiError(
      400,
      'not_applicable',
      `${type} listings have no stored verification flag — their badge is always derived live from KYC status. Manage the underlying KYC verification instead.`
    );
  }

  // Explicit lookup + throw rather than a ternary default — a ternary
  // here would silently fall through to trainer_profiles for any
  // unexpected type value instead of failing loudly. Route-layer
  // isIn(VERIFIABLE_PROFILE_TYPES) validation already prevents this in
  // practice, but the service layer shouldn't rely solely on that.
  const VERIFIABLE_TABLES: Record<string, string> = {
    worker: 'worker_profiles',
    trainer: 'trainer_profiles',
  };
  const table = VERIFIABLE_TABLES[type];
  if (!table) throw new ApiError(400, 'invalid_type', `Unknown profile type: ${type}`);

  const result = await query(`UPDATE ${table} SET is_verified = $1 WHERE user_id = $2 RETURNING user_id, is_verified`, [
    verified,
    profileUserId,
  ]);
  if (result.rows.length === 0) throw new ApiError(404, 'not_found', `No ${type} profile found for this user.`);
  return result.rows[0];
}

// ── KYC verification review queue ─────────────────────────────────────

export interface ListVerificationsParams {
  status?: string;
  page: number;
  limit: number;
}

export async function listVerifications(params: ListVerificationsParams) {
  const { status, page, limit } = params;
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (status) {
    conditions.push(`iv.status = $${i++}`);
    values.push(status);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const res = await query(
    `SELECT iv.*, u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM identity_verifications iv
     JOIN users u ON u.id = iv.user_id
     ${whereClause}
     ORDER BY iv.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    values
  );
  return res.rows;
}

/**
 * Admin manually approves/rejects a KYC verification — per doc's MVP
 * scope: "manual admin review acceptable at launch". Reuses the same
 * syncVerifiedBadge function the real provider webhook calls, so admin
 * approval and a real webhook confirmation produce identical downstream
 * effects (badge + trust_score recompute).
 */
export async function updateVerificationStatus(verificationId: string, newStatus: 'verified' | 'rejected') {
  const existing = await query('SELECT user_id, type FROM identity_verifications WHERE id = $1', [verificationId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Verification not found.');
  const { user_id, type } = existing.rows[0];

  const result = await query(
    `UPDATE identity_verifications
     SET status = $1, verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE verified_at END
     WHERE id = $2
     RETURNING *`,
    [newStatus, verificationId]
  );

  await syncVerifiedBadge(user_id);

  return { ...result.rows[0], userId: user_id, type };
}

// ── Reports ───────────────────────────────────────────────────────────

export interface ListReportsParams {
  status?: string;
  page: number;
  limit: number;
}

export async function listReports(params: ListReportsParams) {
  const { status, page, limit } = params;
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (status) {
    conditions.push(`r.status = $${i++}`);
    values.push(status);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const res = await query(
    `SELECT r.*, u.full_name AS reporter_name
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    values
  );
  return res.rows;
}

export async function updateReportStatus(reportId: string, adminId: string, newStatus: string) {
  const result = await query(
    `UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3 RETURNING *`,
    [newStatus, adminId, reportId]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'not_found', 'Report not found.');
  return result.rows[0];
}

// ── Categories ────────────────────────────────────────────────────────

const CATEGORY_TABLES: Record<string, string> = {
  service: 'service_categories',
  rental: 'rental_categories',
  product: 'product_categories',
};

/**
 * Lists a category type's base rows joined with any admin override —
 * giving a single view of "what students/customers actually see" (the
 * override-adjusted label/disabled state) without mutating the original
 * seed data. category_type/category_id are validated against a fixed
 * whitelist (CATEGORY_TABLES keys) before ever reaching string
 * interpolation, so this is not a SQL-injection vector despite the
 * table name being built from a variable.
 */
export async function listCategories(categoryType: string) {
  const table = CATEGORY_TABLES[categoryType];
  if (!table) throw new ApiError(400, 'invalid_type', `Unknown category type: ${categoryType}`);

  const res = await query(
    `SELECT c.*, co.is_disabled, co.overrides, co.updated_at AS override_updated_at
     FROM ${table} c
     LEFT JOIN category_overrides co ON co.category_type = $1 AND co.category_id = c.id
     ORDER BY c.slug`,
    [categoryType]
  );
  return res.rows;
}

/**
 * Creates a new category directly in the base table — true CRUD, distinct
 * from the override mechanism below which only relabels/disables existing
 * categories. service_categories uses flat name_en/name_ta/... columns;
 * rental_categories and product_categories use a single jsonb `names`
 * column — these are genuinely different shapes per the actual schema
 * (not an inconsistency to paper over), so this branches accordingly.
 */
export async function createCategory(
  categoryType: string,
  slug: string,
  names: Record<string, string>,
  icon?: string
) {
  const table = CATEGORY_TABLES[categoryType];
  if (!table) throw new ApiError(400, 'invalid_type', `Unknown category type: ${categoryType}`);

  try {
    if (categoryType === 'service') {
      const result = await query(
        `INSERT INTO service_categories (slug, name_en, name_ta, name_hi, name_te, name_ml, icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [slug, names.en ?? null, names.ta ?? null, names.hi ?? null, names.te ?? null, names.ml ?? null, icon ?? null]
      );
      return result.rows[0];
    } else if (categoryType === 'rental') {
      const result = await query(
        `INSERT INTO rental_categories (slug, names, icon) VALUES ($1, $2, $3) RETURNING *`,
        [slug, JSON.stringify(names), icon ?? null]
      );
      return result.rows[0];
    } else {
      // product_categories has no icon column at all (per migration 0007).
      const result = await query(`INSERT INTO product_categories (slug, names) VALUES ($1, $2) RETURNING *`, [
        slug,
        JSON.stringify(names),
      ]);
      return result.rows[0];
    }
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'duplicate_slug', `A ${categoryType} category with this slug already exists.`);
    }
    throw err;
  }
}

export async function setCategoryOverride(
  adminId: string,
  categoryType: string,
  categoryId: string,
  isDisabled?: boolean,
  overrides?: Record<string, unknown>
) {
  const table = CATEGORY_TABLES[categoryType];
  if (!table) throw new ApiError(400, 'invalid_type', `Unknown category type: ${categoryType}`);

  const existsRes = await query(`SELECT id FROM ${table} WHERE id = $1`, [categoryId]);
  if (existsRes.rows.length === 0) throw new ApiError(404, 'not_found', `${categoryType} category not found.`);

  const result = await query(
    `INSERT INTO category_overrides (category_type, category_id, is_disabled, overrides, updated_by)
     VALUES ($1, $2, COALESCE($3, false), COALESCE($4, '{}'), $5)
     ON CONFLICT (category_type, category_id)
     DO UPDATE SET
       is_disabled = COALESCE($3, category_overrides.is_disabled),
       overrides = COALESCE($4, category_overrides.overrides),
       updated_by = $5
     RETURNING *`,
    [categoryType, categoryId, isDisabled, overrides ? JSON.stringify(overrides) : null, adminId]
  );
  return result.rows[0];
}

export async function deleteCategory(categoryType: string, categoryId: string) {
  const table = CATEGORY_TABLES[categoryType];
  if (!table) throw new ApiError(400, 'invalid_type', `Unknown category type: ${categoryType}`);

  const result = await query(`DELETE FROM ${table} WHERE id = $1`, [categoryId]);
  if (result.rowCount === 0) throw new ApiError(404, 'not_found', `${categoryType} category not found.`);
}

// ── Analytics ─────────────────────────────────────────────────────────

/**
 * Per doc: "basic analytics (DAU, listings/day, requests/day)". DAU here
 * means distinct users who created or updated any tracked row today —
 * we don't have a dedicated session/activity-log table, so this is
 * approximated from the most recent updated_at across users themselves
 * (login refreshes update nothing on the users row currently, so this
 * undercounts pure-browsing sessions — noted honestly rather than
 * overclaiming precision the schema doesn't support).
 */
export async function getAnalyticsOverview() {
  const [dauRes, listingsRes, requestsRes] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(DISTINCT id)::text AS count FROM users WHERE updated_at >= now() - interval '1 day'`),
    query<{ count: string }>(`
      SELECT (
        (SELECT COUNT(*) FROM worker_profiles WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM rental_listings WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM product_listings WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM courses WHERE created_at >= now() - interval '1 day')
      )::text AS count
    `),
    query<{ count: string }>(`
      SELECT (
        (SELECT COUNT(*) FROM service_requests WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM rental_bookings WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM orders WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM community_requests WHERE created_at >= now() - interval '1 day') +
        (SELECT COUNT(*) FROM enrollments WHERE created_at >= now() - interval '1 day')
      )::text AS count
    `),
  ]);

  const [totalUsersRes, openReportsRes, pendingVerificationsRes] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM reports WHERE status = 'open'`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM identity_verifications WHERE status = 'pending'`),
  ]);

  return {
    dau: parseInt(dauRes.rows[0].count, 10),
    newListingsToday: parseInt(listingsRes.rows[0].count, 10),
    newRequestsToday: parseInt(requestsRes.rows[0].count, 10),
    totalUsers: parseInt(totalUsersRes.rows[0].count, 10),
    openReports: parseInt(openReportsRes.rows[0].count, 10),
    pendingVerifications: parseInt(pendingVerificationsRes.rows[0].count, 10),
  };
}

import { query, withTransaction } from '../../config/db';
import { ApiError } from '../../middleware/error';

// ── Trainer Profiles ──────────────────────────────────────────────────

export interface TrainerProfileInput {
  subjects?: string[];
  qualifications?: string;
  bio?: string;
}

export async function createOrUpdateTrainerProfile(userId: string, input: TrainerProfileInput) {
  const result = await query(
    `INSERT INTO trainer_profiles (user_id, subjects, qualifications, bio)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       subjects = EXCLUDED.subjects,
       qualifications = EXCLUDED.qualifications,
       bio = EXCLUDED.bio
     RETURNING *`,
    [userId, input.subjects ?? [], input.qualifications ?? null, input.bio ?? null]
  );

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'trainer'
     ON CONFLICT DO NOTHING`,
    [userId]
  );

  return result.rows[0];
}

export async function getTrainerByUserId(userId: string) {
  const res = await query(
    `SELECT tp.*, u.full_name, u.photo_url
     FROM trainer_profiles tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.user_id = $1`,
    [userId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Trainer profile not found.');
  return res.rows[0];
}

/**
 * Partial update — only touches fields actually provided. Distinct from
 * createOrUpdateTrainerProfile's upsert, which unconditionally writes
 * EXCLUDED.* for every column: calling that with a partial body (e.g. just
 * {bio: '...'}) would wipe subjects/qualifications back to their input
 * defaults ([]/null) since they'd be absent from the request. This mirrors
 * the hire module's createWorkerProfile (upsert) vs patchWorkerProfile
 * (selective update) split.
 */
export async function patchTrainerProfile(userId: string, input: Partial<TrainerProfileInput>) {
  const existing = await query('SELECT * FROM trainer_profiles WHERE user_id = $1', [userId]);
  if (existing.rows.length === 0) {
    throw new ApiError(404, 'not_found', 'No trainer profile exists yet. Create one first.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    subjects: input.subjects,
    qualifications: input.qualifications,
    bio: input.bio,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) return existing.rows[0];

  values.push(userId);
  const result = await query(`UPDATE trainer_profiles SET ${sets.join(', ')} WHERE user_id = $${i} RETURNING *`, values);
  return result.rows[0];
}

// ── Courses ───────────────────────────────────────────────────────────

export interface CreateCourseInput {
  subject: string;
  title: string;
  description?: string;
  mode: 'online' | 'offline' | 'hybrid';
  language?: string;
  price?: number;
  capacity: number;
  schedule?: Record<string, unknown>;
  lat?: number;
  lng?: number;
}

export async function createCourse(trainerId: string, input: CreateCourseInput) {
  const profileRes = await query('SELECT 1 FROM trainer_profiles WHERE user_id = $1', [trainerId]);
  if (profileRes.rows.length === 0) {
    throw new ApiError(400, 'trainer_profile_required', 'Create a trainer profile before listing a course.');
  }

  const result = await query(
    `INSERT INTO courses (trainer_id, subject, title, description, mode, language, price, capacity, schedule, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), $8, $9, $10, $11)
     RETURNING *`,
    [
      trainerId,
      input.subject,
      input.title,
      input.description ?? null,
      input.mode,
      input.language ?? null,
      input.price,
      input.capacity,
      input.schedule ? JSON.stringify(input.schedule) : null,
      input.lat ?? null,
      input.lng ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateCourse(trainerId: string, courseId: string, input: Partial<CreateCourseInput>) {
  const existing = await query('SELECT trainer_id FROM courses WHERE id = $1', [courseId]);
  if (existing.rows.length === 0) throw new ApiError(404, 'not_found', 'Course not found.');
  if (existing.rows[0].trainer_id !== trainerId) {
    throw new ApiError(403, 'forbidden', 'Only the trainer can update this course.');
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const fieldMap: Record<string, any> = {
    subject: input.subject,
    title: input.title,
    description: input.description,
    mode: input.mode,
    language: input.language,
    price: input.price,
    capacity: input.capacity,
    schedule: input.schedule ? JSON.stringify(input.schedule) : undefined,
    lat: input.lat,
    lng: input.lng,
  };
  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (sets.length === 0) {
    const res = await query('SELECT * FROM courses WHERE id = $1', [courseId]);
    return res.rows[0];
  }

  values.push(courseId);
  const result = await query(`UPDATE courses SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return result.rows[0];
}

export async function getCourseById(courseId: string) {
  const res = await query(
    `SELECT c.*, u.full_name AS trainer_name, u.photo_url AS trainer_photo_url,
            tp.qualifications AS trainer_qualifications, tp.is_verified AS trainer_is_verified,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status IN ('pending', 'confirmed')) AS enrolled_count
     FROM courses c
     JOIN users u ON u.id = c.trainer_id
     LEFT JOIN trainer_profiles tp ON tp.user_id = c.trainer_id
     WHERE c.id = $1`,
    [courseId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Course not found.');
  return res.rows[0];
}

export interface SearchCoursesParams {
  subject?: string;
  mode?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page: number;
  limit: number;
}

export async function searchCourses(params: SearchCoursesParams) {
  const { subject, mode, lat, lng, radiusKm, page, limit } = params;
  const hasGeo = lat !== undefined && lng !== undefined;

  const conditions: string[] = ['c.is_active = true'];
  const values: any[] = [];
  let i = 1;

  if (subject) {
    conditions.push(`c.subject ILIKE $${i++}`);
    values.push(`%${subject}%`);
  }
  if (mode) {
    conditions.push(`c.mode = $${i++}`);
    values.push(mode);
  }

  let latParam = '';
  let lngParam = '';
  if (hasGeo) {
    values.push(lat, lng);
    latParam = `$${i++}`;
    lngParam = `$${i++}`;
  }
  if (hasGeo && radiusKm) {
    // Online-mode courses have no meaningful physical location, so the
    // radius filter must only ever exclude offline/hybrid courses lacking
    // coordinates — never silently exclude online courses that have no
    // lat/lng at all.
    conditions.push(
      `(c.lat IS NULL OR c.lng IS NULL OR (
         earth_box(ll_to_earth(${latParam}, ${lngParam}), $${i} * 1000) @> ll_to_earth(c.lat, c.lng)
         AND earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(c.lat, c.lng)) <= $${i} * 1000
       ))`
    );
    values.push(radiusKm);
    i += 1;
  }

  const distanceSelect = hasGeo
    ? `earth_distance(ll_to_earth(${latParam}, ${lngParam}), ll_to_earth(c.lat, c.lng)) / 1000.0 AS distance_km`
    : `NULL AS distance_km`;

  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const sql = `
    SELECT c.id, c.trainer_id, c.subject, c.title, c.mode, c.language, c.price, c.capacity,
           c.rating_avg, c.rating_count, c.created_at,
           u.full_name AS trainer_name, u.photo_url AS trainer_photo_url,
           tp.is_verified AS trainer_is_verified,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status IN ('pending', 'confirmed')) AS enrolled_count,
           ${distanceSelect}
    FROM courses c
    JOIN users u ON u.id = c.trainer_id
    LEFT JOIN trainer_profiles tp ON tp.user_id = c.trainer_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${hasGeo ? 'distance_km ASC' : 'c.created_at DESC'}
    LIMIT $${i++} OFFSET $${i++}
  `;

  const result = await query(sql, values);
  return result.rows;
}

export async function listMyCourses(trainerId: string) {
  const res = await query('SELECT * FROM courses WHERE trainer_id = $1 ORDER BY created_at DESC', [trainerId]);
  return res.rows;
}

// ── Enrollments ───────────────────────────────────────────────────────

/**
 * Creates an enrollment, enforcing course.capacity server-side via
 * SELECT ... FOR UPDATE, per doc security requirement. Locking the course
 * row (not just counting enrollments) prevents the classic race where two
 * students enroll concurrently and both pass a capacity check that was
 * read before either insert committed.
 */
export async function createEnrollment(studentId: string, courseId: string) {
  return withTransaction(async (client) => {
    const courseRes = await client.query(
      'SELECT trainer_id, capacity, is_active FROM courses WHERE id = $1 FOR UPDATE',
      [courseId]
    );
    if (courseRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Course not found.');
    const course = courseRes.rows[0];

    if (!course.is_active) throw new ApiError(400, 'course_inactive', 'This course is no longer active.');
    if (course.trainer_id === studentId) {
      throw new ApiError(400, 'invalid_request', 'You cannot enroll in your own course.');
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM enrollments WHERE course_id = $1 AND status IN ('pending', 'confirmed')`,
      [courseId]
    );
    if (countRes.rows[0].count >= course.capacity) {
      throw new ApiError(409, 'course_full', 'This course is at full capacity.');
    }

    try {
      const result = await client.query(
        `INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2) RETURNING *`,
        [courseId, studentId]
      );
      // trainerId included so the controller can fire a new-enrollment
      // notification without a redundant second lookup of the course.
      return { ...result.rows[0], trainerId: course.trainer_id };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ApiError(409, 'already_enrolled', 'You are already enrolled in this course.');
      }
      throw err;
    }
  });
}

export async function listMyEnrollments(studentId: string) {
  const res = await query(
    `SELECT e.*, c.title AS course_title, c.mode AS course_mode, c.price AS course_price,
            u.full_name AS trainer_name
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     JOIN users u ON u.id = c.trainer_id
     WHERE e.student_id = $1
     ORDER BY e.created_at DESC`,
    [studentId]
  );
  return res.rows;
}

export async function listEnrollmentsForTrainer(trainerId: string) {
  const res = await query(
    `SELECT e.*, c.title AS course_title, u.full_name AS student_name
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     JOIN users u ON u.id = e.student_id
     WHERE c.trainer_id = $1
     ORDER BY e.created_at DESC`,
    [trainerId]
  );
  return res.rows;
}

const VALID_ENROLLMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
};

export async function updateEnrollmentStatus(enrollmentId: string, actingUserId: string, newStatus: string) {
  const enrollmentRes = await query(
    `SELECT e.*, c.trainer_id FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.id = $1`,
    [enrollmentId]
  );
  if (enrollmentRes.rows.length === 0) throw new ApiError(404, 'not_found', 'Enrollment not found.');
  const enrollment = enrollmentRes.rows[0];

  const isTrainer = enrollment.trainer_id === actingUserId;
  const isStudent = enrollment.student_id === actingUserId;
  if (!isTrainer && !isStudent) {
    throw new ApiError(403, 'forbidden', 'You are not a participant in this enrollment.');
  }
  if (['confirmed', 'completed'].includes(newStatus) && !isTrainer) {
    throw new ApiError(403, 'forbidden', 'Only the trainer can confirm or complete an enrollment.');
  }

  const allowed = VALID_ENROLLMENT_TRANSITIONS[enrollment.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, 'invalid_transition', `Cannot move enrollment from '${enrollment.status}' to '${newStatus}'.`);
  }

  const updated = await query('UPDATE enrollments SET status = $1 WHERE id = $2 RETURNING *', [
    newStatus,
    enrollmentId,
  ]);
  return { ...updated.rows[0], trainerId: enrollment.trainer_id };
}

// ── Reviews (course-scoped) ──────────────────────────────────────────

export async function createCourseReview(reviewerId: string, courseId: string, rating: number, comment?: string) {
  // Per doc precedent (Phase 2/3): reviews require having actually
  // participated — here, a confirmed-or-completed enrollment in the course.
  const enrollmentRes = await query(
    `SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2 AND status IN ('confirmed', 'completed')`,
    [courseId, reviewerId]
  );
  if (enrollmentRes.rows.length === 0) {
    throw new ApiError(400, 'enrollment_required', 'You must be enrolled in this course to review it.');
  }
  const enrollmentId = enrollmentRes.rows[0].id;

  try {
    // request_ref = enrollmentId, not NULL: the reviews table's UNIQUE
    // constraint is (reviewer_id, target_type, target_id, request_ref),
    // and Postgres never treats two NULLs as equal in a unique constraint
    // — leaving request_ref NULL here would silently let a student submit
    // unlimited duplicate reviews for the same course. Using the
    // enrollment's own id as the anchor (each student has exactly one
    // enrollment per course, per the table's own UNIQUE(course_id,
    // student_id)) gives every review a real, non-null, naturally-unique value.
    const result = await query(
      `INSERT INTO reviews (reviewer_id, target_type, target_id, request_ref, rating, comment)
       VALUES ($1, 'course', $2, $3, $4, $5) RETURNING *`,
      [reviewerId, courseId, enrollmentId, rating, comment ?? null]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ApiError(409, 'already_reviewed', 'You have already reviewed this course.');
    }
    throw err;
  }
}

export async function listCourseReviews(courseId: string) {
  const res = await query(
    `SELECT r.*, u.full_name AS reviewer_name, u.photo_url AS reviewer_photo_url
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.target_type = 'course' AND r.target_id = $1
     ORDER BY r.created_at DESC`,
    [courseId]
  );
  return res.rows;
}

import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { reverseGeocode } from '../../lib/geo';
import { generateUploadSignature } from '../../config/cloudinary';

export async function getMe(userId: string) {
  const res = await query(
    `SELECT id, email, phone, full_name, photo_url, preferred_language,
            lat, lng, address, search_radius_km,
            is_email_verified, is_phone_verified, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'User not found');

  const roles = await query<{ name: string }>(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
    [userId]
  );
  return { ...res.rows[0], roles: roles.rows.map((r) => r.name) };
}

export async function updateMe(userId: string, fields: { fullName?: string; photoUrl?: string }) {
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (fields.fullName !== undefined) {
    sets.push(`full_name = $${i++}`);
    values.push(fields.fullName);
  }
  if (fields.photoUrl !== undefined) {
    sets.push(`photo_url = $${i++}`);
    values.push(fields.photoUrl);
  }
  if (sets.length === 0) return getMe(userId);

  values.push(userId);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, values);
  return getMe(userId);
}

export async function updateLocation(
  userId: string,
  lat: number,
  lng: number,
  searchRadiusKm?: number,
  address?: string
) {
  let finalAddress = address;
  if (!finalAddress) {
    const geocoded = await reverseGeocode(lat, lng);
    finalAddress = geocoded.address;
  }

  await query(
    `UPDATE users SET lat = $1, lng = $2, address = $3, search_radius_km = COALESCE($4, search_radius_km)
     WHERE id = $5`,
    [lat, lng, finalAddress, searchRadiusKm ?? null, userId]
  );
  return getMe(userId);
}

export async function updateLanguage(userId: string, language: string) {
  await query('UPDATE users SET preferred_language = $1 WHERE id = $2', [language, userId]);
  return getMe(userId);
}

export async function addRole(userId: string, role: string) {
  const roleRow = await query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [role]);
  if (roleRow.rows.length === 0) throw new ApiError(400, 'invalid_role', `Unknown role: ${role}`);
  await query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, roleRow.rows[0].id]
  );
  return getMe(userId);
}

export async function removeRole(userId: string, role: string) {
  if (role === 'customer') {
    throw new ApiError(400, 'cannot_remove_default_role', 'The customer role cannot be removed.');
  }
  const roleRow = await query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [role]);
  if (roleRow.rows.length === 0) throw new ApiError(400, 'invalid_role', `Unknown role: ${role}`);
  await query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleRow.rows[0].id]);
  return getMe(userId);
}

export async function getPhotoUploadSignature(userId: string) {
  return generateUploadSignature(`locallink/users/${userId}/profile`);
}

// ── Emergency Contacts (schema defined Phase 1; used by SOS in Phase 5) ──

export async function listEmergencyContacts(userId: string) {
  const res = await query('SELECT id, name, phone, created_at FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at', [userId]);
  return res.rows;
}

export async function addEmergencyContact(userId: string, name: string, phone: string) {
  const res = await query(
    `INSERT INTO emergency_contacts (user_id, name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, phone) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, phone, created_at`,
    [userId, name, phone]
  );
  return res.rows[0];
}

export async function deleteEmergencyContact(userId: string, contactId: string) {
  const res = await query('DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2', [contactId, userId]);
  if (res.rowCount === 0) throw new ApiError(404, 'not_found', 'Emergency contact not found');
}

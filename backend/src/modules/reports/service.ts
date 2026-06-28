import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';

export async function createReport(reporterId: string, targetType: string, targetId: string, reason: string) {
  const result = await query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4) RETURNING *`,
    [reporterId, targetType, targetId, reason]
  );
  return result.rows[0];
}

export async function listMyReports(reporterId: string) {
  const res = await query('SELECT * FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC', [reporterId]);
  return res.rows;
}

export async function getReportById(reportId: string) {
  const res = await query(
    `SELECT r.*, u.full_name AS reporter_name
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     WHERE r.id = $1`,
    [reportId]
  );
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Report not found.');
  return res.rows[0];
}

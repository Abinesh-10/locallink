import { query } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { getSocketServer } from '../../config/socket';
import { logger } from '../../lib/logger';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Persists a notification and best-effort pushes it live via Socket.IO to
 * the user's personal room. The DB write is the source of truth — if a
 * user is offline when this fires, they still see the notification next
 * time they open the app via GET /notifications. The socket push is
 * purely for live delivery and is deliberately non-fatal if it fails.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const result = await query(
    `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [input.userId, input.type, JSON.stringify(input.payload ?? {})]
  );

  try {
    getSocketServer()
      .to(`user:${input.userId}`)
      .emit('notification:new', {
        id: result.rows[0].id,
        type: input.type,
        payload: input.payload ?? {},
        createdAt: result.rows[0].created_at,
      });
  } catch (err: any) {
    logger.warn('Failed to push live notification', { userId: input.userId, type: input.type, error: err.message });
  }
}

export async function listNotifications(userId: string, unreadOnly?: boolean) {
  const conditions = ['user_id = $1'];
  const values: any[] = [userId];
  if (unreadOnly) {
    conditions.push('read_at IS NULL');
  }
  const res = await query(
    `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`,
    values
  );
  return res.rows;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const res = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return parseInt(res.rows[0].count, 10);
}

export async function markAsRead(userId: string, notificationId: string) {
  const result = await query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *',
    [notificationId, userId]
  );
  if (result.rows.length === 0) {
    const existsRes = await query('SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2', [
      notificationId,
      userId,
    ]);
    if (existsRes.rows.length === 0) {
      throw new ApiError(404, 'not_found', 'Notification not found.');
    }
  }
  return result.rows[0];
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [
    userId,
  ]);
  return result.rowCount;
}

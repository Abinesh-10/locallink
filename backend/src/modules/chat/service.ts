import { query, withTransaction } from '../../config/db';
import { ApiError } from '../../middleware/error';
import { parsePagination, encodeCursor, decodeCursor } from '../../lib/pagination';
import { createNotification } from '../notifications/service';

/**
 * Sorts a pair of user IDs so the lower one is always user_a, per
 * chat_rooms' CHECK (user_a_id < user_b_id) constraint — this comparison
 * must exactly match Postgres's uuid '<' operator, which for the standard
 * lowercase hyphenated text representation is equivalent to a plain
 * string comparison.
 */
function sortPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export async function getOrCreateRoom(currentUserId: string, otherUserId: string) {
  if (currentUserId === otherUserId) {
    throw new ApiError(400, 'invalid_request', 'You cannot start a chat with yourself.');
  }
  const otherUserRes = await query('SELECT id FROM users WHERE id = $1', [otherUserId]);
  if (otherUserRes.rows.length === 0) {
    throw new ApiError(404, 'not_found', 'User not found.');
  }

  const [userAId, userBId] = sortPair(currentUserId, otherUserId);

  const existing = await query('SELECT * FROM chat_rooms WHERE user_a_id = $1 AND user_b_id = $2', [
    userAId,
    userBId,
  ]);
  if (existing.rows.length > 0) return existing.rows[0];

  const result = await query('INSERT INTO chat_rooms (user_a_id, user_b_id) VALUES ($1, $2) RETURNING *', [
    userAId,
    userBId,
  ]);
  return result.rows[0];
}

export async function assertRoomMembership(userId: string, roomId: string): Promise<{ user_a_id: string; user_b_id: string }> {
  const res = await query('SELECT user_a_id, user_b_id FROM chat_rooms WHERE id = $1', [roomId]);
  if (res.rows.length === 0) throw new ApiError(404, 'not_found', 'Chat room not found.');
  const room = res.rows[0];
  if (room.user_a_id !== userId && room.user_b_id !== userId) {
    throw new ApiError(403, 'forbidden', 'You are not a participant in this chat.');
  }
  return room;
}

export async function listMyRooms(userId: string) {
  const res = await query(
    `SELECT cr.id, cr.last_message_at, cr.created_at,
            CASE WHEN cr.user_a_id = $1 THEN cr.user_b_id ELSE cr.user_a_id END AS other_user_id,
            u.full_name AS other_user_name, u.photo_url AS other_user_photo_url,
            lm.body AS last_message_body, lm.type AS last_message_type, lm.sender_id AS last_message_sender_id,
            (SELECT COUNT(*) FROM chat_messages cm
               WHERE cm.room_id = cr.id AND cm.sender_id != $1 AND cm.read_at IS NULL) AS unread_count
     FROM chat_rooms cr
     JOIN users u ON u.id = (CASE WHEN cr.user_a_id = $1 THEN cr.user_b_id ELSE cr.user_a_id END)
     LEFT JOIN LATERAL (
       SELECT body, type, sender_id FROM chat_messages
       WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1
     ) lm ON true
     WHERE cr.user_a_id = $1 OR cr.user_b_id = $1
     ORDER BY cr.last_message_at DESC NULLS LAST, cr.created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const res = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM chat_messages cm
     JOIN chat_rooms cr ON cr.id = cm.room_id
     WHERE (cr.user_a_id = $1 OR cr.user_b_id = $1) AND cm.sender_id != $1 AND cm.read_at IS NULL`,
    [userId]
  );
  return parseInt(res.rows[0].total, 10);
}

export async function listMessages(userId: string, roomId: string, rawQuery: any) {
  await assertRoomMembership(userId, roomId);
  const { limit, cursor } = parsePagination(rawQuery);

  const conditions = ['room_id = $1'];
  const values: any[] = [roomId];
  let i = 2;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(`(created_at, id) < ($${i++}, $${i++})`);
      values.push(decoded.createdAt, decoded.id);
    }
  }

  values.push(limit);
  const res = await query(
    `SELECT * FROM chat_messages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT $${i}`,
    values
  );

  const messages = res.rows;
  const nextCursor =
    messages.length === limit
      ? encodeCursor(messages[messages.length - 1].created_at, messages[messages.length - 1].id)
      : null;

  return { messages, nextCursor };
}

export interface SendMessageInput {
  type?: 'text' | 'image' | 'location';
  body: string;
}

export async function sendMessage(senderId: string, roomId: string, input: SendMessageInput) {
  const room = await assertRoomMembership(senderId, roomId);
  const recipientId = room.user_a_id === senderId ? room.user_b_id : room.user_a_id;
  const type = input.type ?? 'text';

  if (type === 'image') {
    try {
      new URL(input.body);
    } catch {
      throw new ApiError(400, 'invalid_request', 'Image messages must contain a valid URL.');
    }
  }
  if (type === 'location') {
    try {
      const parsed = JSON.parse(input.body);
      if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') {
        throw new Error('missing lat/lng');
      }
    } catch {
      throw new ApiError(400, 'invalid_request', 'Location messages must be JSON with numeric lat and lng.');
    }
  }

  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO chat_messages (room_id, sender_id, type, body) VALUES ($1, $2, $3, $4) RETURNING *`,
      [roomId, senderId, type, input.body]
    );
    await client.query('UPDATE chat_rooms SET last_message_at = now() WHERE id = $1', [roomId]);
    return inserted.rows[0];
  });

  // Per doc notification trigger: "new chat message (when not in that
  // room)" — persisted+pushed unconditionally here; the frontend suppresses
  // the banner/badge increment when the recipient is actively viewing this
  // exact room, since the server can't reliably know which screen a
  // connected socket is looking at.
  await createNotification({
    userId: recipientId,
    type: 'chat_message',
    payload: { roomId, senderId, messageType: type },
  });

  return result;
}

export async function markRoomRead(userId: string, roomId: string) {
  await assertRoomMembership(userId, roomId);
  const result = await query(
    `UPDATE chat_messages SET read_at = now()
     WHERE room_id = $1 AND sender_id != $2 AND read_at IS NULL
     RETURNING id`,
    [roomId, userId]
  );
  return result.rowCount;
}

export async function markMessagesDelivered(roomId: string, recipientId: string) {
  const result = await query(
    `UPDATE chat_messages SET delivered_at = now()
     WHERE room_id = $1 AND sender_id != $2 AND delivered_at IS NULL
     RETURNING id, sender_id`,
    [roomId, recipientId]
  );
  return result.rows;
}

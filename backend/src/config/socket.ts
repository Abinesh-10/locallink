import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './env';
import { verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { query } from './db';

let io: SocketIOServer | null = null;

/**
 * Fetches a chat room's participant pair, or null if it doesn't exist.
 * Used both to authorize an action (is this user one of the two?) and to
 * determine who the *other* participant is — one query serves both needs,
 * avoiding a redundant second round-trip.
 */
async function getRoomParticipants(roomId: string): Promise<{ user_a_id: string; user_b_id: string } | null> {
  try {
    const res = await query<{ user_a_id: string; user_b_id: string }>(
      'SELECT user_a_id, user_b_id FROM chat_rooms WHERE id = $1',
      [roomId]
    );
    return res.rows[0] ?? null;
  } catch (err: any) {
    logger.error('getRoomParticipants failed', { roomId, error: err.message });
    return null;
  }
}

/**
 * Initializes Socket.IO with JWT auth on the handshake, per doc's Phase 7
 * security requirement: "Socket.IO auth via JWT in handshake".
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('unauthorized'));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.roles = payload.roles;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    // Every user gets a personal room for targeted notification delivery
    // (notification:new, sos:alert), per doc: "Socket.IO room per user (user:<id>)".
    socket.join(`user:${userId}`);
    logger.debug('Socket connected', { userId, socketId: socket.id });

    // chat:typing is a pure ephemeral signal — no DB write, just relayed
    // to the other participant. Per doc security requirement: "users can
    // only join their own chat rooms (enforced in Socket.IO middleware +
    // REST)" — checked here before relaying, since a socket could claim
    // any roomId in the payload.
    socket.on('chat:typing', async (payload: { roomId?: string }) => {
      const roomId = payload?.roomId;
      if (!roomId || typeof roomId !== 'string') return;
      const room = await getRoomParticipants(roomId);
      if (!room || (room.user_a_id !== userId && room.user_b_id !== userId)) {
        logger.warn('Rejected chat:typing for non-member', { userId, roomId });
        return;
      }
      const otherUserId = room.user_a_id === userId ? room.user_b_id : room.user_a_id;
      io!.to(`user:${otherUserId}`).emit('chat:typing', { roomId, userId });
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer {
  if (!io) throw new Error('Socket.IO server not initialized. Call initSocketServer first.');
  return io;
}

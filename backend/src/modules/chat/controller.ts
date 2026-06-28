import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { getSocketServer } from '../../config/socket';
import { logger } from '../../lib/logger';

export async function startChat(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await service.getOrCreateRoom(req.user!.id, req.body.otherUserId);
    res.status(201).json({ success: true, room });
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await service.listMyRooms(req.user!.id);
    const totalUnread = await service.getTotalUnreadCount(req.user!.id);
    res.json({ success: true, rooms, totalUnread });
  } catch (err) {
    next(err);
  }
}

export async function listMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listMessages(req.user!.id, req.params.roomId, req.query);
    res.json({ success: true, messages: result.messages, nextCursor: result.nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const message = await service.sendMessage(req.user!.id, req.params.roomId, req.body);

    try {
      const room = await service.assertRoomMembership(req.user!.id, req.params.roomId);
      const recipientId = room.user_a_id === req.user!.id ? room.user_b_id : room.user_a_id;
      getSocketServer().to(`user:${recipientId}`).emit('chat:message', { roomId: req.params.roomId, message });
    } catch (socketErr: any) {
      logger.warn('Failed to emit chat:message', { error: socketErr.message });
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const markedCount = await service.markRoomRead(req.user!.id, req.params.roomId);

    try {
      const room = await service.assertRoomMembership(req.user!.id, req.params.roomId);
      const otherUserId = room.user_a_id === req.user!.id ? room.user_b_id : room.user_a_id;
      getSocketServer().to(`user:${otherUserId}`).emit('chat:read', { roomId: req.params.roomId, readBy: req.user!.id });
    } catch (socketErr: any) {
      logger.warn('Failed to emit chat:read', { error: socketErr.message });
    }

    res.json({ success: true, markedCount });
  } catch (err) {
    next(err);
  }
}

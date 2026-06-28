import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Lazily creates and connects the Socket.IO client, authenticating via the
 * current access token in the handshake (matches backend's
 * config/socket.ts JWT verification). No event listeners are registered
 * here — chat:*, notification:new, sos:alert handlers are added by their
 * respective feature modules starting Phase 5/7.
 */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

import { useEffect, useState } from 'react';
import { chatApi } from '@/features/chat/api';
import { notificationsApi } from '@/features/notifications/api';
import { connectSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';

export function useUnreadCounts() {
  const { isAuthenticated } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  async function refresh() {
    if (!isAuthenticated) return;
    try {
      const [roomsRes, notifRes] = await Promise.all([chatApi.listRooms(), notificationsApi.list(true)]);
      setUnreadChats(roomsRes.data.totalUnread ?? 0);
      setUnreadNotifications(notifRes.data.unreadCount ?? 0);
    } catch {
      // Badge counts are a nice-to-have; a failed refresh just leaves the
      // last known values on screen rather than showing an error.
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = connectSocket();
    socket.on('chat:message', refresh);
    socket.on('notification:new', refresh);
    return () => {
      socket.off('chat:message', refresh);
      socket.off('notification:new', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { unreadChats, unreadNotifications, refresh };
}

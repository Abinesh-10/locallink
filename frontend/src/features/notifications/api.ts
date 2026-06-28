import { apiClient } from '@/lib/api-client';

export const notificationsApi = {
  list: (unreadOnly?: boolean) => apiClient.get('/notifications', { params: { unread: unreadOnly } }),
  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};

import { apiClient } from '@/lib/api-client';

export const chatApi = {
  startChat: (otherUserId: string) => apiClient.post('/chats/start', { otherUserId }),
  listRooms: () => apiClient.get('/chats'),
  listMessages: (roomId: string, cursor?: string, limit?: number) =>
    apiClient.get(`/chats/${roomId}/messages`, { params: { cursor, limit } }),
  sendMessage: (roomId: string, type: 'text' | 'image' | 'location', body: string) =>
    apiClient.post(`/chats/${roomId}/messages`, { type, body }),
  markRead: (roomId: string) => apiClient.patch(`/chats/${roomId}/read`),

  getUploadSignature: (purpose: string) => apiClient.post('/uploads/cloudinary-signature', { purpose }),
};

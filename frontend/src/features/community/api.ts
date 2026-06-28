import { apiClient } from '@/lib/api-client';

export interface CreateRequestInput {
  type: 'blood' | 'volunteer' | 'emergency' | 'medical' | 'other';
  urgency?: 'low' | 'normal' | 'urgent' | 'critical';
  bloodGroup?: string;
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  contactVisible?: boolean;
  expiresAt?: string;
}

export interface ListRequestsParams {
  type?: string;
  urgency?: string;
  lat?: number;
  lng?: number;
  radius?: 5 | 10 | 15 | 25;
  page?: number;
  limit?: number;
}

export interface CreateLostFoundInput {
  kind: 'lost' | 'found';
  title: string;
  description?: string;
  photos?: string[];
  lastSeenLat?: number;
  lastSeenLng?: number;
  lastSeenAt?: string;
}

export const communityApi = {
  createRequest: (input: CreateRequestInput) => apiClient.post('/community', input),
  listRequests: (params: ListRequestsParams) => apiClient.get('/community', { params }),
  getRequest: (id: string) => apiClient.get(`/community/${id}`),
  respond: (id: string, message?: string) => apiClient.post(`/community/${id}/respond`, { message }),
  close: (id: string) => apiClient.patch(`/community/${id}/close`),

  sendSos: (lat: number, lng: number, description?: string) =>
    apiClient.post('/community/sos', { lat, lng, description }),

  getVolunteers: (lat: number, lng: number, radius?: 5 | 10 | 15 | 25) =>
    apiClient.get('/community/volunteers', { params: { lat, lng, radius } }),

  createLostFound: (input: CreateLostFoundInput) => apiClient.post('/lost-and-found', input),
  updateLostFound: (id: string, input: Partial<CreateLostFoundInput>) => apiClient.patch(`/lost-and-found/${id}`, input),
  markLostFoundResolved: (id: string) => apiClient.patch(`/lost-and-found/${id}/resolve`),
  deleteLostFound: (id: string) => apiClient.delete(`/lost-and-found/${id}`),
  getLostFound: (id: string) => apiClient.get(`/lost-and-found/${id}`),
  listLostFound: (kind?: 'lost' | 'found', lat?: number, lng?: number, radius?: 5 | 10 | 15 | 25) =>
    apiClient.get('/lost-and-found', { params: { kind, lat, lng, radius } }),
};

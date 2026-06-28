import { apiClient } from '@/lib/api-client';

export interface WorkerProfileInput {
  categoryId: string;
  subSkills?: string[];
  experienceYears?: number;
  hourlyRate?: number;
  dayRate?: number;
  bio?: string;
  portfolioUrls?: string[];
  isAvailable?: boolean;
}

export interface SearchWorkersParams {
  category?: string;
  lat?: number;
  lng?: number;
  radius?: 5 | 10 | 15 | 25;
  minRating?: number;
  verified?: boolean;
  sort?: 'distance' | 'rating' | 'trust';
  page?: number;
  limit?: number;
}

export const hireApi = {
  // Categories
  getServiceCategories: () => apiClient.get('/service-categories'),

  // Worker profile
  createWorkerProfile: (input: WorkerProfileInput) => apiClient.post('/worker-profile', input),
  updateWorkerProfile: (input: Partial<WorkerProfileInput>) => apiClient.patch('/worker-profile', input),
  getMyWorkerProfile: () => apiClient.get('/worker-profile/me'),

  // Discovery
  searchWorkers: (params: SearchWorkersParams) => apiClient.get('/workers', { params }),
  getWorker: (userId: string) => apiClient.get(`/workers/${userId}`),

  // Service requests
  createServiceRequest: (workerId: string, scheduledFor?: string, description?: string) =>
    apiClient.post('/service-requests', { workerId, scheduledFor, description }),
  listSentRequests: (status?: string) => apiClient.get('/service-requests/mine', { params: { status } }),
  listInboxRequests: (status?: string) => apiClient.get('/service-requests/inbox', { params: { status } }),
  updateRequestStatus: (requestId: string, status: string) =>
    apiClient.patch(`/service-requests/${requestId}/status`, { status }),

  // Reviews
  createReview: (workerId: string, requestId: string, rating: number, comment?: string) =>
    apiClient.post('/reviews', { workerId, requestId, rating, comment }),

  // Reputation
  getReputation: (userId: string) => apiClient.get(`/users/${userId}/reputation`),

  // KYC / Verification
  initiateVerification: (type: 'aadhaar' | 'driving_license' | 'gst', documentNumber: string) =>
    apiClient.post('/verifications/initiate', { type, documentNumber }),
  getVerificationStatus: () => apiClient.get('/verifications/status'),
};

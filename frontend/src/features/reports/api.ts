import { apiClient } from '@/lib/api-client';

export const reportsApi = {
  create: (targetType: string, targetId: string, reason: string) =>
    apiClient.post('/reports', { targetType, targetId, reason }),
  listMine: () => apiClient.get('/reports/mine'),
};

import { apiClient } from '@/lib/api-client';

export const adminApi = {
  listUsers: (search?: string, suspended?: boolean) =>
    apiClient.get('/admin/users', { params: { search, suspended } }),
  getUser: (id: string) => apiClient.get(`/admin/users/${id}`),
  suspendUser: (id: string, suspended: boolean) => apiClient.patch(`/admin/users/${id}/suspend`, { suspended }),

  setProfileVerified: (type: 'worker' | 'trainer', id: string, verified: boolean) =>
    apiClient.patch(`/admin/profiles/${type}/${id}/verify`, { verified }),

  listVerifications: (status?: string) => apiClient.get('/admin/verifications', { params: { status } }),
  updateVerification: (id: string, status: 'verified' | 'rejected') =>
    apiClient.patch(`/admin/verifications/${id}`, { status }),

  listReports: (status?: string) => apiClient.get('/admin/reports', { params: { status } }),
  updateReport: (id: string, status: 'reviewed' | 'dismissed' | 'actioned') =>
    apiClient.patch(`/admin/reports/${id}`, { status }),

  listCategories: (type: 'service' | 'rental' | 'product') => apiClient.get(`/admin/categories/${type}`),
  createCategory: (type: 'service' | 'rental' | 'product', slug: string, names: Record<string, string>, icon?: string) =>
    apiClient.post(`/admin/categories/${type}`, { slug, names, icon }),
  overrideCategory: (
    type: 'service' | 'rental' | 'product',
    categoryId: string,
    isDisabled?: boolean,
    overrides?: Record<string, unknown>
  ) => apiClient.patch(`/admin/categories/${type}/${categoryId}`, { isDisabled, overrides }),
  deleteCategory: (type: 'service' | 'rental' | 'product', categoryId: string) =>
    apiClient.delete(`/admin/categories/${type}/${categoryId}`),

  getAnalyticsOverview: () => apiClient.get('/admin/analytics/overview'),
};

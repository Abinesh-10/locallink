import { apiClient } from '@/lib/api-client';

export interface TrainerProfileInput {
  subjects?: string[];
  qualifications?: string;
  bio?: string;
}

export interface CourseInput {
  subject: string;
  title: string;
  description?: string;
  mode: 'online' | 'offline' | 'hybrid';
  language?: string;
  price?: number;
  capacity: number;
  schedule?: Record<string, unknown>;
  lat?: number;
  lng?: number;
}

export interface SearchCoursesParams {
  subject?: string;
  mode?: 'online' | 'offline' | 'hybrid';
  lat?: number;
  lng?: number;
  radius?: 5 | 10 | 15 | 25;
  page?: number;
  limit?: number;
}

export const learnApi = {
  createTrainerProfile: (input: TrainerProfileInput) => apiClient.post('/trainer-profile', input),
  patchTrainerProfile: (input: Partial<TrainerProfileInput>) => apiClient.patch('/trainer-profile', input),
  getMyTrainerProfile: () => apiClient.get('/trainer-profile/me'),

  createCourse: (input: CourseInput) => apiClient.post('/courses', input),
  updateCourse: (id: string, input: Partial<CourseInput>) => apiClient.patch(`/courses/${id}`, input),
  getCourse: (id: string) => apiClient.get(`/courses/${id}`),
  searchCourses: (params: SearchCoursesParams) => apiClient.get('/courses', { params }),
  getMyCourses: () => apiClient.get('/courses-mine'),

  createEnrollment: (courseId: string) => apiClient.post('/enrollments', { courseId }),
  listMyEnrollments: () => apiClient.get('/enrollments/mine'),
  listTrainerEnrollments: () => apiClient.get('/enrollments/trainer'),
  updateEnrollmentStatus: (enrollmentId: string, status: string) =>
    apiClient.patch(`/enrollments/${enrollmentId}/status`, { status }),

  createReview: (courseId: string, rating: number, comment?: string) =>
    apiClient.post('/course-reviews', { courseId, rating, comment }),
};

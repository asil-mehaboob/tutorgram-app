import { apiRequest } from './client';

export type MyLearningCourse = {
  courseId: string;
  courseSlug: string;
  title: string;
  thumbnail: string | null;
  tutorName: string;
  progressPercent: number;
  lastAccessedAt: string;
  nextLessonId: string | null;
  completedAt: string | null;
};

export type MyLearningResponse = {
  items: MyLearningCourse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type CertificateRecord = {
  id: string;
  certificateUrl: string;
  certificateCode: string;
  issuedAt: string;
  course: {
    id: string;
    slug: string;
    title: string;
    thumbnail: string | null;
    tutor: { id: string; fullName: string };
  };
};

export type MyCertificatesResponse = {
  items: CertificateRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function getMyCertificates(query?: { page?: number; limit?: number }): Promise<MyCertificatesResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<MyCertificatesResponse>(`/api/learning/certificates${qs}`);
}

export function getMyLearning(query?: { page?: number; limit?: number }): Promise<MyLearningResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<MyLearningResponse>(`/api/learning/courses/enrollments/my-learning${qs}`);
}

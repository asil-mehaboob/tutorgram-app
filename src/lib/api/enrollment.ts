import { apiRequest } from './client';

// ─── Lesson Detail (video content + status) ───────────────────────────────────

export type LessonDetail = {
  id: string;
  content: string | null;
  videoStatus: string | null;
};

export function getLessonDetail(lessonId: string): Promise<LessonDetail> {
  return apiRequest<LessonDetail>(`/api/learning/courses/lessons/${lessonId}`);
}

export type LessonStream = {
  streamUrl: string;
  contentType: 'hls' | 'mp4';
};

export function getLessonStream(lessonId: string): Promise<LessonStream> {
  return apiRequest<LessonStream>(`/api/video/${lessonId}/token`);
}

// ─── Course Progress ──────────────────────────────────────────────────────────

export type LessonProgressRecord = {
  lessonId: string;
  isCompleted: boolean;
  watchedSeconds: number;
};

export type CourseProgressData = {
  progress: {
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
    lastAccessedAt: string;
    completedAt: string | null;
  };
  lessons: LessonProgressRecord[];
  certificate?: {
    code: string;
    url: string;
    issuedAt: string;
  };
};

export function getCourseProgressData(courseId: string): Promise<CourseProgressData> {
  return apiRequest<CourseProgressData>(`/api/learning/courses/${courseId}/progress`);
}

export function updateCourseProgressData(
  courseId: string,
  data: { completedLessonIds?: string[]; lastAccessedLessonId?: string },
): Promise<CourseProgressData> {
  return apiRequest<CourseProgressData>(`/api/learning/courses/${courseId}/progress`, {
    method: 'PATCH',
    body: data,
  });
}

// ─── My Learning ──────────────────────────────────────────────────────────────

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

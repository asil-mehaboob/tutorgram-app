import { tutorApiRequest } from './tutor-client';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED' | 'PENDING_REVIEW';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'RESOURCE';
export type VideoStatus = 'NONE' | 'PROCESSING' | 'READY' | 'FAILED';

export type Category = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

export type TutorLesson = {
  id: string;
  title: string;
  type: LessonType;
  duration: number | null;
  isFreePreview: boolean;
  videoStatus: VideoStatus;
  order: number;
};

export type TutorSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: TutorLesson[];
};

export type TutorCourse = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  detailedDescription: string | null;
  level: CourseLevel;
  language: string;
  thumbnail: string | null;
  promoVideoUrl: string | null;
  whatYouLearn: string[];
  whoIsFor: string[];
  prerequisites: string[];
  requirements: string[];
  isFree: boolean;
  price: number | null;
  discountPercent: number | null;
  status: CourseStatus;
  studentsCount: number;
  earnings: number;
  rating: number | null;
  reviewsCount: number;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  sections: TutorSection[];
  createdAt: string;
  updatedAt: string;
};

export type CreateCourseInput = {
  title: string;
  shortDescription?: string;
  categoryId?: string;
  subcategoryId?: string;
  level?: CourseLevel;
  language?: string;
};

export type UpdateCourseInput = Partial<{
  title: string;
  shortDescription: string;
  detailedDescription: string;
  level: CourseLevel;
  language: string;
  thumbnail: string;
  promoVideoUrl: string;
  whatYouLearn: string[];
  whoIsFor: string[];
  prerequisites: string[];
  requirements: string[];
  isFree: boolean;
  price: number;
  discountPercent: number;
  categoryId: string;
  subcategoryId: string;
}>;

export type UpdateLessonInput = Partial<{
  title: string;
  type: LessonType;
  isFreePreview: boolean;
  duration: number;
  content: string;
  order: number;
}>;

export async function getMyCourses(params?: { status?: CourseStatus; page?: number }): Promise<{ courses: TutorCourse[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return tutorApiRequest<{ courses: TutorCourse[]; total: number }>(`/api/courses${qs ? `?${qs}` : ''}`);
}

export async function getCourse(id: string): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}`);
}

export async function createCourse(data: CreateCourseInput): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>('/api/courses', { method: 'POST', body: data });
}

export async function updateCourse(id: string, data: UpdateCourseInput): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}`, { method: 'PUT', body: data });
}

export async function deleteCourse(id: string): Promise<void> {
  await tutorApiRequest(`/api/courses/${id}`, { method: 'DELETE' });
}

export async function publishCourse(id: string): Promise<void> {
  await tutorApiRequest(`/api/courses/${id}/publish`, { method: 'POST' });
}

export async function getCourseDraft(id: string): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}/draft`);
}

export async function saveCourseDraft(id: string, data: UpdateCourseInput): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}/draft`, { method: 'PATCH', body: data });
}

export async function updateLesson(courseId: string, lessonId: string, data: UpdateLessonInput): Promise<TutorLesson> {
  return tutorApiRequest<TutorLesson>(`/api/courses/${courseId}/lessons/${lessonId}`, { method: 'PUT', body: data });
}

export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  await tutorApiRequest(`/api/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' });
}

export async function getCategories(): Promise<Category[]> {
  return tutorApiRequest<Category[]>('/api/categories');
}

export async function getAiComplete(field: string, context: Record<string, string>): Promise<{ result: string }> {
  return tutorApiRequest<{ result: string }>('/api/ai/complete', { method: 'POST', body: { field, context } });
}

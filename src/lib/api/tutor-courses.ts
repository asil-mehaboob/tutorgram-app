import { tutorApiRequest } from './tutor-client';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED' | 'PENDING_REVIEW';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'RESOURCE';
export type VideoStatus = 'NONE' | 'PROCESSING' | 'READY' | 'FAILED';

export type Category = {
  id: string;
  name: string;
  subCategories: { id: string; name: string }[];
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

// Matches actual API response field names (list + detail)
export type TutorCourse = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  level: CourseLevel;
  language: string;
  thumbnail: string | null;
  promoVideoUrl?: string | null;
  isFree: boolean;
  price: number | null;
  discountPercent?: number | null;
  status: CourseStatus;
  // List response uses these names
  totalStudents: number;
  totalRevenue: number;
  averageRating?: number | null;
  totalSections?: number;
  totalLessons?: number;
  totalDuration?: number;
  // Detail response includes full sections + content arrays
  sections?: TutorSection[];
  whatYouLearn?: string[] | null;
  whoIsFor?: string[] | null;
  requirements?: string[] | null;
  prerequisites?: string[] | null;
  detailedDescription?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  subCategory?: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCourseInput = {
  title: string;
  categoryId: string;
  subCategoryId?: string | null;
  shortDescription?: string;
  level?: CourseLevel;
  language?: string;
  isFree?: boolean;
  sections: {
    title: string;
    description?: string;
    order: number;
    lessons: {
      title: string;
      type: LessonType;
      content?: string;
      duration?: number;
      isFreePreview?: boolean;
      order: number;
    }[];
  }[];
};

export type CreateCourseResponse = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  totalSections: number;
  totalLessons: number;
  category: { id: string; name: string; slug: string };
  createdAt: string;
};

export type UpdateCourseInput = Partial<{
  title: string;
  shortDescription: string;
  detailedDescription: string;
  level: CourseLevel;
  language: string;
  thumbnail: string;
  promoVideoUrl: string;
  whatYouLearn: string | string[];
  whoIsFor: string | string[];
  prerequisites: string | string[];
  requirements: string | string[];
  isFree: boolean;
  price: number | null;
  discountPercent: number | null;
  categoryId: string;
  subCategoryId: string;
}>;

export type UpdateLessonInput = Partial<{
  title: string;
  type: LessonType;
  isFreePreview: boolean;
  duration: number;
  content: string;
  order: number;
}>;

// API returns array directly via successWithMeta(array, meta) → data is the array
export async function getMyCourses(params?: { status?: CourseStatus; page?: number }): Promise<TutorCourse[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return tutorApiRequest<TutorCourse[]>(`/api/courses${qs ? `?${qs}` : ''}`);
}

export async function getCourse(id: string): Promise<TutorCourse> {
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}`);
}

export async function createCourse(data: CreateCourseInput): Promise<CreateCourseResponse> {
  return tutorApiRequest<CreateCourseResponse>('/api/courses', { method: 'POST', body: data });
}

export async function updateCourse(id: string, data: UpdateCourseInput): Promise<{ id: string; title: string; slug: string; status: CourseStatus; updatedAt: string }> {
  return tutorApiRequest(`/api/courses/${id}`, { method: 'PUT', body: data });
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
  return tutorApiRequest<TutorCourse>(`/api/courses/${id}/draft`, { method: 'PUT', body: data });
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

export async function getAiComplete(field: string, context: Record<string, string>): Promise<{ completion: string }> {
  return tutorApiRequest<{ completion: string }>('/api/ai/complete', { method: 'POST', body: { field, context } });
}

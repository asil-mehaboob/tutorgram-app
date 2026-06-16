import { apiRequest } from './client';

export type CourseLesson = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  type: 'VIDEO' | 'ARTICLE' | 'QUIZ' | string;
  duration: number | null;
  isFreePreview: boolean;
  order: number;
};

export type CourseSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CourseLesson[];
};

export type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string | null;
  thumbnail: string | null;
  promoVideoUrl: string | null;
  level: string;
  language: string;
  isFree: boolean;
  price: number | null;
  discountPercent: number;
  effectivePrice: number | null;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  totalDuration: number;
  totalSections: number;
  totalLessons: number;
  whatYouLearn: string | null;
  whoIsFor: string | null;
  prerequisites: string | null;
  learningOutcomes: string[] | null;
  requirements: string | null;
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  instructor: {
    id: string;
    fullName: string;
    professionalTitle: string | null;
    bio: string | null;
    profilePicture: string | null;
    isVerified: boolean;
  };
  brand: { name: string; logoUrl: string | null } | null;
  sections: CourseSection[];
};

export type CourseDetailResponse = { course: CourseDetail };

export function getCourseDetail(courseIdOrSlug: string): Promise<CourseDetailResponse> {
  return apiRequest<CourseDetailResponse>(`/api/learning/courses/${courseIdOrSlug}`);
}

export type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  level: string;
  isFree: boolean;
  price: number | null;
  discountPercent: number;
  effectivePrice: number | null;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  tutor: {
    id: string;
    fullName: string;
    professionalTitle: string | null;
    isVerified: boolean;
  };
};

export type CatalogCoursesResponse = {
  items: CatalogCourse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function getCatalogCourses(query?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  q?: string;
}): Promise<CatalogCoursesResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  if (query?.q) params.set('q', query.q);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CatalogCoursesResponse>(`/api/catalog/courses${qs}`);
}

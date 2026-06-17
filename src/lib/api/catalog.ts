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

export type CourseReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  helpfulCount: number;
  tutorReply: string | null;
  tutorRepliedAt: string | null;
  createdAt: string;
  studentName: string | null;
  studentProfilePicture: string | null;
};

export type CourseReviewsResponse = {
  items: CourseReview[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function getCourseReviews(
  courseId: string,
  query?: { page?: number; limit?: number },
): Promise<CourseReviewsResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CourseReviewsResponse>(`/api/learning/courses/${courseId}/reviews${qs}`);
}

// ─── Instructor ───────────────────────────────────────────────────────────────

export type InstructorSocialLink = {
  platform: string;
  url: string;
};

export type InstructorEducation = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  order: number;
};

export type InstructorExperience = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  order: number;
};

export type InstructorCertification = {
  id: string;
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  order: number;
};

export type InstructorAward = {
  id: string;
  title: string;
  issuer: string;
  date: string | null;
  description: string | null;
  order: number;
};

export type InstructorService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  order: number;
};

export type InstructorDetail = {
  id: string;
  fullName: string;
  professionalTitle: string | null;
  primaryCredibility: string | null;
  bio: string | null;
  profilePicture: string | null;
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  isApproved: boolean;
  totalCourses: number;
  totalStudents: number;
  socialLinks: InstructorSocialLink[];
  education: InstructorEducation[];
  experience: InstructorExperience[];
  certifications: InstructorCertification[];
  awards: InstructorAward[];
  services: InstructorService[];
};

export type InstructorDetailResponse = { instructor: InstructorDetail };

export function getInstructorDetail(id: string): Promise<InstructorDetailResponse> {
  return apiRequest<InstructorDetailResponse>(`/api/catalog/instructors/${id}`);
}

export function getInstructorCourses(
  id: string,
  query?: { page?: number; limit?: number; sortBy?: string },
): Promise<CatalogCoursesResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CatalogCoursesResponse>(`/api/catalog/instructors/${id}/courses${qs}`);
}

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

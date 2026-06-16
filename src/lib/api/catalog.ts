import { apiRequest } from './client';

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

import { apiRequest } from './client';

export type WishlistCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  isFree: boolean;
  effectivePrice: number | null;
  averageRating: number;
  totalStudents: number;
  tutor: { id: string; fullName: string; professionalTitle: string | null };
};

export type WishlistItem = {
  id: string;
  addedAt: string;
  course: WishlistCourse;
};

export type WishlistResponse = {
  items: WishlistItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type TransactionRecord = {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  finalAmount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  course: { id: string; slug: string; title: string; thumbnail: string | null };
};

export type TransactionHistoryResponse = {
  items: TransactionRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function getWishlist(query?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<WishlistResponse>(`/api/commerce/wishlist${qs}`);
}

export function removeFromWishlist(courseId: string) {
  return apiRequest<{ courseId: string; inWishlist: boolean }>('/api/commerce/wishlist', {
    method: 'POST',
    body: { courseId },
  });
}

export function toggleWishlist(courseId: string) {
  return apiRequest<{ courseId: string; inWishlist: boolean }>('/api/commerce/wishlist', {
    method: 'POST',
    body: { courseId },
  });
}

export function enrollFreeCourse(courseId: string) {
  return apiRequest<{ enrollmentId: string; courseId: string; enrolledAt: string }>(
    '/api/commerce/enrollment/free',
    { method: 'POST', body: { courseId } },
  );
}

export function getTransactions(query?: { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<TransactionHistoryResponse>(`/api/commerce/transactions${qs}`);
}

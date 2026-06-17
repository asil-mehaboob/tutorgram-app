import { apiRequest } from './client';

// ─── Razorpay checkout types ──────────────────────────────────────────────────

export type CreateRazorpayOrderResponse = {
  orderId: string;
  amount: number;
  amountInSmallestUnit: number;
  currency: string;
  keyId: string;
};

export type VerifyPaymentResponse = {
  verificationToken: string;
  expiresAt: string;
};

export type ConfirmPaymentItem = {
  courseId: string;
  transaction: {
    id: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    gateway: string;
    gatewayOrderId: string | null;
    gatewayPaymentId: string | null;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
    course: { id: string; slug: string; title: string; thumbnail: string | null };
  };
  enrollmentId: string | null;
};

export type ConfirmPaymentResponse = {
  items: ConfirmPaymentItem[];
  purchasedCourseIds: string[];
  skippedCourseIds: string[];
};

// ─── Wishlist types ───────────────────────────────────────────────────────────

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

// ─── Razorpay checkout ────────────────────────────────────────────────────────

export function createRazorpayOrder(courseIds: string[], currency = 'INR') {
  return apiRequest<CreateRazorpayOrderResponse>(
    '/api/commerce/checkout/razorpay/create-order',
    { method: 'POST', body: { courseIds, currency } },
  );
}

export function verifyPayment(body: {
  gateway: 'RAZORPAY';
  gatewayOrderId: string;
  gatewayPaymentId: string;
  verificationId: string;
  signature: string;
}) {
  return apiRequest<VerifyPaymentResponse>('/api/commerce/checkout/verify', {
    method: 'POST',
    body,
  });
}

export function confirmPayment(body: {
  gateway: 'RAZORPAY';
  gatewayOrderId: string;
  gatewayPaymentId: string;
  courseIds: string[];
  currency: string;
  verificationToken: string;
}) {
  return apiRequest<ConfirmPaymentResponse>('/api/commerce/checkout/confirm', {
    method: 'POST',
    body,
  });
}

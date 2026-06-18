import { tutorApiRequest } from './tutor-client';

export type DashboardStats = {
  // actual API field names
  coursesCreated?: number;
  studentsEnrolled?: number;
  totalEarnings?: number;
  enrolledThisMonth?: number;
  thisMonthEarnings?: number;
  avgRating?: number;
  monthlyRevenue?: { month: string; revenue: number }[];
  // aliased/computed fields
  totalCourses?: number;
  totalStudents?: number;
};

export type DashboardTransaction = {
  id: string;
  // API may return either naming convention
  studentName?: string;
  student?: string;
  studentEmail?: string;
  courseTitle?: string;
  course?: string;
  courseThumbnail?: string | null;
  amount?: number;
  price?: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
};

export type DashboardCourse = {
  id: string;
  title: string;
  thumbnail: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED' | 'PENDING_REVIEW';
  studentsCount: number;
  earnings: number;
  rating: number | null;
};

export type DashboardOverview = {
  stats: DashboardStats;
  transactions: DashboardTransaction[];
  courses?: DashboardCourse[];
};

export type TutorNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return tutorApiRequest<DashboardOverview>('/api/dashboard/overview');
}

export async function getDashboardCourses(): Promise<DashboardCourse[]> {
  return tutorApiRequest<DashboardCourse[]>('/api/dashboard/courses');
}

export async function getNotifications(): Promise<TutorNotification[]> {
  return tutorApiRequest<TutorNotification[]>('/api/dashboard/notifications');
}

export async function markNotificationsRead(): Promise<void> {
  await tutorApiRequest('/api/dashboard/notifications', { method: 'PATCH' });
}

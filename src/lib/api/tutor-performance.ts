import { tutorApiRequest } from './tutor-client';

export type PerformanceOverview = {
  totalRevenue: number;
  avgRating: number;
  completionRate: number;
  totalEnrollments: number;
  monthlyRevenue: { month: string; revenue: number }[];
  ratingDistribution: { stars: number; count: number; percentage?: number }[];
};

export type RevenueData = {
  courses: { courseId: string; title: string; thumbnail: string | null; revenue: number; enrollments: number }[];
  totalRevenue: number;
};

export type StudentAnalytics = {
  totalStudents: number;
  newStudentsThisMonth: number;
  completionRate: number;
  avgProgress: number;
};

export type ReviewAnalytics = {
  avgRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number; percentage: number }[];
  recentReviews: { id: string; studentName: string; rating: number; title: string; comment: string; courseTitle: string; createdAt: string }[];
};

export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  return tutorApiRequest<PerformanceOverview>('/api/dashboard/performance/overview');
}

export async function getRevenueData(): Promise<RevenueData> {
  return tutorApiRequest<RevenueData>('/api/dashboard/performance/revenue');
}

export async function getStudentAnalytics(): Promise<StudentAnalytics> {
  return tutorApiRequest<StudentAnalytics>('/api/dashboard/performance/students');
}

export async function getReviewAnalytics(): Promise<ReviewAnalytics> {
  return tutorApiRequest<ReviewAnalytics>('/api/dashboard/performance/reviews');
}

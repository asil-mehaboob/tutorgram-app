import { tutorApiRequest } from './tutor-client';

export type PlanKey = 'STARTER_MONTHLY' | 'STARTER_YEARLY' | 'PRO_MONTHLY' | 'PRO_YEARLY';

export type UserPlan = {
  isPaid: boolean;
  planKey: PlanKey | null;
  billingCycle: 'monthly' | 'yearly' | null;
  planName: string | null;
  status: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
};

export type SubscriptionOrder = {
  subscriptionId: string;
  planKey: PlanKey;
  amount: number;
  currency: string;
  keyId: string;
};

export async function getUserPlan(): Promise<UserPlan> {
  return tutorApiRequest<UserPlan>('/api/user/plan');
}

export async function createSubscription(data: { planKey: PlanKey; couponCode?: string }): Promise<SubscriptionOrder> {
  return tutorApiRequest<SubscriptionOrder>('/api/create-subscription', { method: 'POST', body: data });
}

export async function verifySubscription(data: { razorpaySubscriptionId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<void> {
  await tutorApiRequest('/api/verify-subscription', { method: 'POST', body: data });
}

export async function validateCoupon(couponCode: string): Promise<{ valid: boolean; discount: number; planKey?: PlanKey }> {
  return tutorApiRequest<{ valid: boolean; discount: number; planKey?: PlanKey }>('/api/validate-coupon', {
    method: 'POST',
    body: { couponCode },
  });
}

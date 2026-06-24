import { tutorApiRequest } from './tutor-client';

export type UserPlan = {
  isPaid: boolean;
  planKey: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  planName: string | null;
};

export type SubscriptionOrder = {
  subscriptionId: string;
  paymentRecordId: string;
  discountAmount: number | null;
  keyId: string;
};

export type CouponValidation = {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    influencerName: string;
  };
};

export async function getUserPlan(): Promise<UserPlan> {
  return tutorApiRequest<UserPlan>('/api/user/plan');
}

export async function createSubscription(data: { planKey: string; couponId?: string }): Promise<SubscriptionOrder> {
  return tutorApiRequest<SubscriptionOrder>('/api/create-subscription', { method: 'POST', body: data });
}

export async function verifySubscription(data: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<void> {
  await tutorApiRequest('/api/verify-subscription', { method: 'POST', body: data });
}

export async function validateCoupon(couponCode: string): Promise<CouponValidation> {
  return tutorApiRequest<CouponValidation>('/api/validate-coupon', { method: 'POST', body: { code: couponCode } });
}

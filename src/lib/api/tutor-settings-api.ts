import { tutorApiRequest } from './tutor-client';

export type AccountSettings = {
  name: string;
  email: string;
};

export type NotificationSettings = {
  courseEnrollments: boolean;
  newReviews: boolean;
  newMessages: boolean;
  newQuestions: boolean;
  payoutAlerts: boolean;
  platformUpdates: boolean;
  marketingEmails: boolean;
};

export type PaymentMethod = 'BANK' | 'UPI' | 'PAYPAL';

export type PaymentSettings = {
  method: PaymentMethod | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankAccountName: string | null;
  upiId: string | null;
  paypalEmail: string | null;
};

export type PrivacySettings = {
  profileVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
};

export async function getAccountSettings(): Promise<AccountSettings> {
  return tutorApiRequest<AccountSettings>('/api/dashboard/settings/account');
}

export async function updateAccountSettings(data: Partial<AccountSettings>): Promise<AccountSettings> {
  return tutorApiRequest<AccountSettings>('/api/dashboard/settings/account', { method: 'PATCH', body: data });
}

export async function changeTutorPassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  await tutorApiRequest('/api/dashboard/settings/password', { method: 'POST', body: data });
}

export async function getTutorNotificationPrefs(): Promise<NotificationSettings> {
  return tutorApiRequest<NotificationSettings>('/api/dashboard/settings/notifications');
}

export async function updateTutorNotificationPrefs(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
  return tutorApiRequest<NotificationSettings>('/api/dashboard/settings/notifications', { method: 'PATCH', body: data });
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  return tutorApiRequest<PaymentSettings>('/api/dashboard/settings/payment');
}

export async function updatePaymentSettings(data: Partial<PaymentSettings>): Promise<PaymentSettings> {
  return tutorApiRequest<PaymentSettings>('/api/dashboard/settings/payment', { method: 'PATCH', body: data });
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  return tutorApiRequest<PrivacySettings>('/api/dashboard/settings/privacy');
}

export async function updatePrivacySettings(data: Partial<PrivacySettings>): Promise<PrivacySettings> {
  return tutorApiRequest<PrivacySettings>('/api/dashboard/settings/privacy', { method: 'PATCH', body: data });
}

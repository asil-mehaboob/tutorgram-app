import { tutorApiRequest } from './tutor-client';

export type AccountSettings = {
  fullName: string;
  email: string;
  phone: string | null;
  bio: string | null;
};

export type NotificationSettings = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  courseUpdates: boolean;
  studentMessages: boolean;
  paymentAlerts: boolean;
  marketingEmails: boolean;
};

export type PaymentMethod = 'BANK';

export type ProfileVisibility = 'public' | 'students only' | 'private';

export type PaymentSettings = {
  paymentMethod: PaymentMethod | null;
  bankAccount: string | null;
  ifscCode: string | null;
  accountHolder: string | null;
  upiId: null;
};

export type PrivacySettings = {
  profileVisibility: ProfileVisibility;
  showEmail: boolean;
  showPhone: boolean;
};

export async function getAccountSettings(): Promise<AccountSettings> {
  const data = await tutorApiRequest<{ account: AccountSettings }>('/api/dashboard/settings');
  return data.account;
}

export async function updateAccountSettings(data: Partial<AccountSettings>): Promise<AccountSettings> {
  return tutorApiRequest<AccountSettings>('/api/dashboard/settings/account', { method: 'PUT', body: data });
}

export async function changeTutorPassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  await tutorApiRequest('/api/dashboard/settings/password', { method: 'PUT', body: data });
}

export async function getTutorNotificationPrefs(): Promise<NotificationSettings> {
  const data = await tutorApiRequest<{ notifications: NotificationSettings }>('/api/dashboard/settings');
  return data.notifications;
}

export async function updateTutorNotificationPrefs(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
  return tutorApiRequest<NotificationSettings>('/api/dashboard/settings/notifications', { method: 'PUT', body: data });
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  return tutorApiRequest<PaymentSettings>('/api/dashboard/settings/payment');
}

export async function updatePaymentSettings(data: Partial<PaymentSettings>): Promise<PaymentSettings> {
  return tutorApiRequest<PaymentSettings>('/api/dashboard/settings/payment', { method: 'PUT', body: data });
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  return tutorApiRequest<PrivacySettings>('/api/dashboard/settings/privacy');
}

export async function updatePrivacySettings(data: Partial<PrivacySettings>): Promise<PrivacySettings> {
  return tutorApiRequest<PrivacySettings>('/api/dashboard/settings/privacy', { method: 'PUT', body: data });
}

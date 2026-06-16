import { apiRequest } from './client';

export type NotificationPreferences = {
  promotions: boolean;
  courseUpdates: boolean;
  messages: boolean;
  reviewReplies: boolean;
  certificates: boolean;
  weeklyDigest: boolean;
};

export type UpdateMeInput = {
  fullName?: string;
  bio?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
};

export type UpdateNotificationPrefsInput = Partial<NotificationPreferences>;

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export function updateMe(body: UpdateMeInput) {
  return apiRequest<{ identity: unknown; session: unknown }>('/api/me', {
    method: 'PATCH',
    body,
  });
}

export function getNotificationPreferences() {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/me/notification-preferences');
}

export function updateNotificationPreferences(body: UpdateNotificationPrefsInput) {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/me/notification-preferences', {
    method: 'PATCH',
    body,
  });
}

export function changePassword(body: ChangePasswordInput) {
  return apiRequest<{ success: boolean }>('/api/me/change-password', {
    method: 'POST',
    body,
  });
}

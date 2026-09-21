import api from '../api';
import { NotificationsResponse } from '../types';

export async function getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>(`/notifications?page=${page}&limit=${limit}`);
  return data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ unreadCount: number }>('/notifications/unread-count');
  return data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/mark-all-read');
}

export async function registerDevice(expoPushToken: string, platform: 'ios' | 'android'): Promise<void> {
  await api.post('/notifications/register-device', { expoPushToken, platform });
}

export async function unregisterDevice(expoPushToken: string): Promise<void> {
  await api.post('/notifications/unregister-device', { expoPushToken });
}

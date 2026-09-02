import { apiRequest } from './client';
import { AppNotification } from '../types';

/** Mine only, newest first, capped at 100 server-side — see
 * backend/src/notifications/notifications.service.ts findMineForUser(). */
export function fetchNotifications(): Promise<AppNotification[]> {
  return apiRequest('/notifications');
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<{ ok: true }> {
  return apiRequest('/notifications/read-all', { method: 'PATCH' });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import { ApiError } from '@/lib/api/client';
import { AppNotification } from '@/lib/types';
import { Button } from '@/components/Button';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotifications(await fetchNotifications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load notifications');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkRead(id: string) {
    // Optimistic — this is a one-way, low-stakes flip; not worth blocking
    // the row on a round trip.
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? prev);
    try {
      await markNotificationRead(id);
    } catch {
      load(); // fall back to the server's actual state if the PATCH failed
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark all as read');
    } finally {
      setIsMarkingAll(false);
    }
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Status changes on applications, participants, and permits.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAllRead} loading={isMarkingAll}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {notifications === null && !error && (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        )}
        {error && <div className="p-6 text-center text-sm text-red-700">{error}</div>}
        {notifications && notifications.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">No notifications yet.</div>
        )}
        {notifications?.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
              n.isRead ? '' : 'bg-emerald-50/50'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                <span className="font-medium text-gray-900">{n.title}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{n.body}</p>
              <p className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.isRead && (
              <button
                onClick={() => handleMarkRead(n.id)}
                className="shrink-0 text-sm text-emerald-700 hover:text-emerald-900"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

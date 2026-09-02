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
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { LoadingState, EmptyState, ErrorState } from '@/components/StateMessage';

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
      <PageHeader
        title="Notifications"
        subtitle="Status changes on applications, participants, and permits."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={handleMarkAllRead} loading={isMarkingAll}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Card className="mt-6 overflow-hidden">
        {notifications === null && !error && <LoadingState />}
        {error && <ErrorState>{error}</ErrorState>}
        {notifications && notifications.length === 0 && (
          <EmptyState>No notifications yet.</EmptyState>
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
      </Card>
    </div>
  );
}

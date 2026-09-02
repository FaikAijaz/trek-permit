import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { fetchNotifications } from '../api/notifications';

// Trekker-only (see app/(app)/_layout.tsx) — the backend only ever creates
// a Notification for an application's applicantUserId, never for an
// officer/admin, so there's nothing for the Field Officer role to show.
interface NotificationsContextValue {
  unreadCount: number;
  /** Re-fetches and updates unreadCount. Call after mount, on tab focus,
   * and after marking something read — there's no push channel here, so
   * this is how the badge ever changes. */
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const items = await fetchNotifications();
      setUnreadCount(items.filter((n) => !n.isRead).length);
    } catch {
      // Silently ignore — the badge just keeps its last known value.
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}

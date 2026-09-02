'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchNotifications } from '@/lib/api/notifications';

export function TopNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Refetches on every route change rather than an interval — the only
  // thing that actually flips isRead in this app is visiting /notifications
  // itself, so a pathname change reliably catches "came back from there."
  useEffect(() => {
    fetchNotifications()
      .then((items) => setUnreadCount(items.filter((n) => !n.isRead).length))
      .catch(() => {});
  }, [pathname]);

  function handleSignOut() {
    signOut();
    router.replace('/login');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/applications" className="text-sm font-semibold text-gray-900">
            Trek Permit &mdash; Dashboard
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/applications" className="text-gray-600 hover:text-gray-900">
              Applications
            </Link>
            <Link href="/routes" className="text-gray-600 hover:text-gray-900">
              Routes
            </Link>
            <Link href="/visitors" className="text-gray-600 hover:text-gray-900">
              Visitors
            </Link>
            {user?.role === 'admin' && (
              <Link href="/audit-log" className="text-gray-600 hover:text-gray-900">
                Audit log
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/notifications" className="text-gray-600 hover:text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <span>
            {user?.fullName ?? user?.mobile}
            <span className="ml-1.5 capitalize text-gray-400">({user?.role})</span>
          </span>
          <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-800">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

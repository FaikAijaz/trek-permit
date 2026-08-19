'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/** Wraps every page under (dashboard) — no user, or a user whose role
 * isn't officer/admin, gets bounced to /login. The backend's RolesGuard is
 * the real enforcement; this just keeps a signed-out or wrong-role visitor
 * from seeing a screen full of failed requests. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'officer' && user.role !== 'admin'))) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || (user.role !== 'officer' && user.role !== 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

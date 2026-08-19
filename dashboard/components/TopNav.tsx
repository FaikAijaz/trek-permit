'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function TopNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    signOut();
    router.replace('/login');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/applications" className="text-sm font-semibold text-gray-900">
          Trek Permit &mdash; Dashboard
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
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

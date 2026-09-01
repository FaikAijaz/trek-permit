'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRoutes } from '@/lib/api/routes';
import { ApiError } from '@/lib/api/client';
import { TrekRoute } from '@/lib/types';
import { Button } from '@/components/Button';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<TrekRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRoutes(await fetchRoutes());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load routes');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Trek routes</h1>
          <p className="mt-1 text-sm text-gray-500">
            What trekkers can apply against — open/closed, required documents, lead time.
          </p>
        </div>
        <Link href="/routes/new">
          <Button>New route</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {routes === null && !error && (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        )}
        {error && <div className="p-6 text-center text-sm text-red-700">{error}</div>}
        {routes && routes.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            No routes yet — create the first one.
          </div>
        )}
        {routes?.map((route) => (
          <Link
            key={route.id}
            href={`/routes/${route.id}`}
            className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
          >
            <div>
              <div className="font-medium text-gray-900">
                {route.name} <span className="font-normal text-gray-400">&middot; {route.region}</span>
              </div>
              <div className="text-sm text-gray-500">
                {route.difficulty ?? 'difficulty not set'} &middot; {route.minLeadTimeDays} day
                {route.minLeadTimeDays === 1 ? '' : 's'} notice
                {route.capacityPerDay ? ` · capacity ${route.capacityPerDay}/day` : ''}
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                route.isOpen
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-gray-300 bg-gray-100 text-gray-500'
              }`}
            >
              {route.isOpen ? 'Open' : 'Closed'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

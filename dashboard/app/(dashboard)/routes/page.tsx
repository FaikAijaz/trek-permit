'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRoutes } from '@/lib/api/routes';
import { ApiError } from '@/lib/api/client';
import { TrekRoute } from '@/lib/types';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { LoadingState, EmptyState, ErrorState } from '@/components/StateMessage';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<TrekRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  // Client-side, not a server round-trip — see docs/WEEK7_SPEC.md Section 2:
  // one department, one season, this list stays small enough that filtering
  // the already-fetched array is simpler than adding query params for it.
  const normalizedSearch = search.trim().toLowerCase();
  const visibleRoutes = routes?.filter(
    (route) =>
      !normalizedSearch ||
      route.name.toLowerCase().includes(normalizedSearch) ||
      route.region.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div>
      <PageHeader
        title="Trek routes"
        subtitle="What trekkers can apply against — open/closed, required documents, lead time."
        action={
          <Link href="/routes/new">
            <Button>New route</Button>
          </Link>
        }
      />

      <div className="mt-6">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or region…"
          className="w-72"
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        {routes === null && !error && <LoadingState />}
        {error && <ErrorState>{error}</ErrorState>}
        {routes && routes.length === 0 && (
          <EmptyState>No routes yet — create the first one.</EmptyState>
        )}
        {routes && routes.length > 0 && visibleRoutes?.length === 0 && (
          <EmptyState>No routes match &quot;{search.trim()}&quot;.</EmptyState>
        )}
        {visibleRoutes?.map((route) => (
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
      </Card>
    </div>
  );
}

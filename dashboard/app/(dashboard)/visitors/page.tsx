'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchRoutes, fetchVisitors, VisitorListItem } from '@/lib/api/routes';
import { ApiError } from '@/lib/api/client';
import { TrekRoute } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { LoadingState, EmptyState, ErrorState } from '@/components/StateMessage';

// YYYY-MM-DD in the browser's local timezone — Date#toISOString() would
// shift this to UTC first, which can land on the wrong day.
function todayLocal(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function VisitorsPage() {
  const [routes, setRoutes] = useState<TrekRoute[]>([]);
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [visitors, setVisitors] = useState<VisitorListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes()
      .then((r) => {
        setRoutes(r);
        if (r.length > 0) setRouteId((current) => current || r[0].id);
      })
      .catch(() => setRoutes([]));
  }, []);

  const load = useCallback(async () => {
    if (!routeId || !date) return;
    setVisitors(null);
    setError(null);
    try {
      setVisitors(await fetchVisitors(routeId, date));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the visitor list');
    }
  }, [routeId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Visitor list"
        subtitle="Who's on a route on a given date — approved participants only, read-only. Not a check-in/check-out log."
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Select label="Route" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
          {routes.length === 0 && <option value="">No routes</option>}
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name}
            </option>
          ))}
        </Select>
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <Card className="mt-6 overflow-x-auto">
        {visitors === null && !error && <LoadingState />}
        {error && <ErrorState>{error}</ErrorState>}
        {visitors && visitors.length === 0 && (
          <EmptyState>Nobody approved for this route on this date.</EmptyState>
        )}
        {visitors && visitors.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Application</th>
                <th className="px-4 py-2 font-medium">Permit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visitors.map((v) => (
                <tr key={v.participantId}>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                    {v.fullName}
                    {v.isLeader && (
                      <span className="ml-2 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Leader
                      </span>
                    )}
                    {v.isGuide && (
                      <span className="ml-2 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Guide
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">…{v.identityLast4}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">{v.mobile ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                    {v.applicationReference}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500 capitalize">
                    {v.permitStatus ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

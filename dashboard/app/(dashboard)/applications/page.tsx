'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApplications } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/client';
import { Application, ApplicationStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';

// Oldest-submission-first is the backend's own default for the staff
// queue (applications.service.ts findAllForReview) — no client-side
// re-sort needed to match it.
const FILTERS: { label: string; value: ApplicationStatus | undefined }[] = [
  { label: 'Needs review', value: 'submitted' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Permit issued', value: 'permit_issued' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: undefined },
];

export default function ApplicationsQueuePage() {
  const [filter, setFilter] = useState<ApplicationStatus | undefined>('submitted');
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: ApplicationStatus | undefined) => {
    setApplications(null);
    setError(null);
    try {
      setApplications(await fetchApplications(status));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applications');
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
      <p className="mt-1 text-sm text-gray-500">
        Every trekker&apos;s application, oldest submission first &mdash; this is the review queue.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {applications === null && !error && (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        )}
        {error && <div className="p-6 text-center text-sm text-red-700">{error}</div>}
        {applications && applications.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">Nothing in this view.</div>
        )}
        {applications?.map((app) => {
          const leader = app.participants?.find((p) => p.isLeader);
          return (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium text-gray-900">{app.reference}</div>
                <div className="text-sm text-gray-500">
                  {leader?.fullName ?? '—'} &middot; {app.type}
                  {app.groupType ? ` (${app.groupType})` : ''} &middot;{' '}
                  {app.startDate.slice(0, 10)} &rarr; {app.endDate.slice(0, 10)}
                </div>
              </div>
              <StatusBadge status={app.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuditLog } from '@/lib/api/audit-log';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { AuditLogEntry } from '@/lib/types';
import { AuditLogTable } from '@/components/AuditLogTable';

// Matches the entityType strings AuditService.log() callers actually use
// (backend/src/**/*.service.ts) — kept as a plain list here rather than a
// shared enum since entityType itself isn't a Prisma enum on the backend.
const ENTITY_TYPES = ['application', 'participant', 'permit', 'trek_route', 'document', 'user'];

const selectClass =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEntries(
        await fetchAuditLog({
          entityType: entityType || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the audit log');
    }
  }, [entityType, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Backend also enforces this (403 for a non-admin querying without an
  // entity scope) — checked here too so an officer sees an explanation
  // instead of a failed request.
  if (user && user.role !== 'admin') {
    return (
      <p className="text-sm text-gray-500">
        The full audit log is admin-only. You can still see an application&apos;s own activity from
        its detail page.
      </p>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>
        <p className="mt-1 text-sm text-gray-500">Every recorded action across the system.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Entity type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className={selectClass}
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={selectClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      <div className="mt-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {!error && entries === null && (
          <p className="p-6 text-center text-sm text-gray-400">Loading…</p>
        )}
        {!error && entries && (
          <>
            <AuditLogTable entries={entries} />
            {entries.length === 200 && (
              <p className="mt-2 text-xs text-gray-400">
                Showing the most recent 200 entries — narrow the filters above to see more.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

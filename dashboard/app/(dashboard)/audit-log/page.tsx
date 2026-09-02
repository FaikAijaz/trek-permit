'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuditLog } from '@/lib/api/audit-log';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { AuditLogEntry } from '@/lib/types';
import { AuditLogTable } from '@/components/AuditLogTable';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { LoadingState, ErrorState } from '@/components/StateMessage';

// Matches the entityType strings AuditService.log() callers actually use
// (backend/src/**/*.service.ts) — kept as a plain list here rather than a
// shared enum since entityType itself isn't a Prisma enum on the backend.
const ENTITY_TYPES = ['application', 'participant', 'permit', 'trek_route', 'document', 'user'];

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
      <PageHeader title="Audit log" subtitle="Every recorded action across the system." />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Select label="Entity type" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="mt-4">
        {error && <ErrorState>{error}</ErrorState>}
        {!error && entries === null && <LoadingState />}
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

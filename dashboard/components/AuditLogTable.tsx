'use client';

import { AuditLogEntry } from '@/lib/types';

/** 'application.approved' -> 'Application approved'. */
function formatAction(action: string): string {
  const spaced = action.replace('.', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function AuditLogTable({
  entries,
  emptyMessage = 'No activity yet.',
}: {
  entries: AuditLogEntry[];
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2 font-medium">When</th>
            <th className="px-4 py-2 font-medium">Action</th>
            <th className="px-4 py-2 font-medium">Entity</th>
            <th className="px-4 py-2 font-medium">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                {formatAction(entry.action)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                {entry.entityType} &middot;{' '}
                <span title={entry.entityId}>{entry.entityId.slice(0, 8)}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                {entry.actor ? (entry.actor.fullName ?? entry.actor.mobile) : 'System'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

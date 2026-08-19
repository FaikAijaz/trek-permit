import { statusStyles, statusLabel } from '@/lib/theme';

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {statusLabel(status)}
    </span>
  );
}

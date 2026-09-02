import { ReactNode } from 'react';

/** The bordered colored box used for rejection reasons, action errors,
 * delete/revoke confirmations, and unresolved-participant warnings —
 * previously the same three-color className copy-pasted at each site.
 *
 * `size` picks between two complete padding/text-size combinations rather
 * than letting the caller override via `className` — two conflicting
 * Tailwind utilities (e.g. base `p-3` plus a caller's `p-2.5`) don't
 * resolve by source order in the JSX string, only by Tailwind's own
 * generated CSS order, which isn't something a call site controls. */
export function Banner({
  tone = 'error',
  size = 'default',
  className = '',
  children,
}: {
  tone?: 'error' | 'warning';
  size?: 'default' | 'compact';
  className?: string;
  children: ReactNode;
}) {
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-red-200 bg-red-50 text-red-800';
  const sizeClasses = size === 'compact' ? 'p-2.5 text-xs' : 'p-3 text-sm';
  return (
    <div className={`rounded-md border ${sizeClasses} ${toneClasses} ${className}`}>{children}</div>
  );
}

import { ReactNode } from 'react';

/** The "rounded-lg border border-gray-200 bg-white" treatment used for
 * every panel and table wrapper in the dashboard — padding, overflow, and
 * margin are left to the caller since those genuinely vary by context. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>;
}

import { ReactNode } from 'react';

/** Loading/empty/error text centered inside a list Card — same box, same
 * padding, only the color and copy differ, so all three share one
 * implementation rather than drifting (audit-log's error box used to be
 * styled differently from every other list page's). */
function Centered({ tone, children }: { tone: 'muted' | 'error'; children: ReactNode }) {
  return (
    <div className={`p-6 text-center text-sm ${tone === 'error' ? 'text-red-700' : 'text-gray-400'}`}>
      {children}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <Centered tone="muted">{label}</Centered>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Centered tone="muted">{children}</Centered>;
}

export function ErrorState({ children }: { children: ReactNode }) {
  return <Centered tone="error">{children}</Centered>;
}

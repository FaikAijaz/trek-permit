import { ReactNode } from 'react';

/** The h1+subtitle block repeated at the top of every dashboard page,
 * optionally with a right-aligned action (a button, or nothing). Safe to
 * always render the flex wrapper — with no `action`, justify-between has
 * nothing to space out and it looks identical to a plain block. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

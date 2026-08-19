import { ReactNode } from 'react';
import { RequireStaff } from '@/components/RequireStaff';
import { TopNav } from '@/components/TopNav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireStaff>
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </RequireStaff>
  );
}

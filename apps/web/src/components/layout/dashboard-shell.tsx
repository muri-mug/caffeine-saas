'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface DashboardShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export function DashboardShell({ children, header }: DashboardShellProps) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sarta_token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {header}
          {children}
        </main>
      </div>
    </div>
  );
}

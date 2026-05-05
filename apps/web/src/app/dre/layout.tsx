import { DashboardShell } from '@/components/layout/dashboard-shell';
export default function DreLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

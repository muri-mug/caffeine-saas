import { DashboardShell } from '@/components/layout/dashboard-shell';
export default function VendasLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

import { DashboardShell } from '@/components/layout/dashboard-shell';
export default function CaixaLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

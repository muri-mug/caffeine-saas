'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  FileText,
  Settings,
  HelpCircle,
} from '@/lib/icons';

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  const navItems = [
    { href: '/dashboard',     label: t.nav.overview,  icon: LayoutDashboard },
    { href: '/vendas',        label: t.nav.sales,      icon: ShoppingCart },
    { href: '/estoque',       label: t.nav.inventory,  icon: Package },
    { href: '/caixa',         label: t.nav.cashflow,   icon: Wallet },
    { href: '/dre',           label: t.nav.dre,        icon: FileText },
    { href: '/configuracoes', label: t.nav.settings,   icon: Settings },
    { href: '/ajuda',         label: t.nav.help,        icon: HelpCircle },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-lg font-bold text-primary tracking-tight">Sarta</span>
        <span className="ml-1.5 text-xs text-muted-foreground font-medium">{t.nav.tagline}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Sarta SaaS v0.1</p>
      </div>
    </aside>
  );
}

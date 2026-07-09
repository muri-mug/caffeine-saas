'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { RefreshCw, Zap, LogOut } from '@/lib/icons';
import { api } from '@/lib/api';

export function Topbar() {
  const router = useRouter();
  const t = useT();
  const [syncing, setSyncing] = useState(false);

  function handleLogout() {
    api.clearToken();
    router.replace('/login');
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await api.triggerSync();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-1.5 rounded-full bg-positive-muted px-2.5 py-1">
        <Zap className="h-3 w-3 text-positive" />
        <span className="text-xs font-medium text-positive">{t.topbar.realtime}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
          title={t.topbar.sync}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {t.topbar.sync}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
          title={t.topbar.logout}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>

        <div className="h-8 w-8 rounded-full bg-brand-muted ring-1 ring-border flex items-center justify-center ml-1">
          <span className="text-xs font-semibold text-brand">S</span>
        </div>
      </div>
    </header>
  );
}

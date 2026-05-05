'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw, Zap, LogOut } from '@/lib/icons';
import { api } from '@/lib/api';

export function Topbar() {
  const router = useRouter();

  function handleLogout() {
    api.clearToken();
    router.replace('/login');
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-positive" />
        <span className="text-xs text-muted-foreground">Dados em tempo real</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Sincronizar dados"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sincronizar
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Sair"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>

        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">S</span>
        </div>
      </div>
    </header>
  );
}

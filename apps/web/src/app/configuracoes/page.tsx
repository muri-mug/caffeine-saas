'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { Moon, Sun } from '@/lib/icons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <h2 className="card-title">{title}</h2>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function ConfiguracoesPage() {
  const { theme, setTheme, lang, setLang } = useSettings();
  const t = useT();
  const s = t.settings;

  const [companyName, setCompanyName]     = useState('');
  const [nameStatus,  setNameStatus]      = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [currentPwd,  setCurrentPwd]      = useState('');
  const [newPwd,       setNewPwd]          = useState('');
  const [confirmPwd,   setConfirmPwd]      = useState('');
  const [pwdStatus,    setPwdStatus]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pwdError,     setPwdError]        = useState('');

  useEffect(() => {
    api.getTenant().then(({ tenant }) => setCompanyName(tenant.name)).catch(() => {});
  }, []);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    setNameStatus('saving');
    try {
      await api.updateTenantName(companyName);
      setNameStatus('saved');
      setTimeout(() => setNameStatus('idle'), 2500);
    } catch {
      setNameStatus('error');
      setTimeout(() => setNameStatus('idle'), 2500);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError('');
    if (newPwd !== confirmPwd) {
      setPwdError(s.passwordMismatch);
      return;
    }
    setPwdStatus('saving');
    try {
      await api.changePassword(currentPwd, newPwd);
      setPwdStatus('saved');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdStatus('idle'), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : s.errorGeneric;
      setPwdError(msg);
      setPwdStatus('error');
      setTimeout(() => setPwdStatus('idle'), 2500);
    }
  }

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{s.title}</h1>
      </div>

      {/* ── Appearance ── */}
      <Section title={s.appearance}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {s.darkMode}
            </div>
            <p className="text-xs text-muted-foreground">{s.darkModeDesc}</p>
          </div>
          <Toggle
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </div>
      </Section>

      {/* ── Language ── */}
      <Section title={s.language}>
        <p className="text-xs text-muted-foreground">{s.languageDesc}</p>
        <div className="flex gap-2">
          {(['pt', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                lang === l
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {l === 'pt' ? s.langPt : s.langEn}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Company ── */}
      <Section title={s.company}>
        <form onSubmit={handleSaveName} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="company-name" className="text-xs text-muted-foreground">{s.companyName}</label>
            <input
              id="company-name"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={nameStatus === 'saving'}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            {nameStatus === 'saving' ? s.saving : nameStatus === 'saved' ? s.saved : s.save}
          </button>
        </form>
        {nameStatus === 'error' && (
          <p className="text-xs text-destructive">{s.errorGeneric}</p>
        )}
      </Section>

      {/* ── Security ── */}
      <Section title={s.security}>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-xs text-muted-foreground">{s.currentPassword}</label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs text-muted-foreground">{s.newPassword}</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-xs text-muted-foreground">{s.confirmPassword}</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {pwdError && <p className="text-xs text-destructive">{pwdError}</p>}
          {pwdStatus === 'saved' && (
            <p className="text-xs text-positive">{s.passwordChanged}</p>
          )}
          <button
            type="submit"
            disabled={pwdStatus === 'saving'}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pwdStatus === 'saving' ? s.saving : s.changePassword}
          </button>
        </form>
      </Section>
    </div>
  );
}

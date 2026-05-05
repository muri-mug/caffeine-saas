'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSettings } from '@/lib/settings-context';
import { api } from '@/lib/api';
import { Moon, Sun } from '@/lib/icons';

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  pt: {
    title:            'Configurações',
    appearance:       'Aparência',
    darkMode:         'Modo escuro',
    darkModeDesc:     'Alterna entre tema claro e escuro.',
    language:         'Idioma',
    languageDesc:     'Escolha o idioma da interface.',
    langPt:           'Português',
    langEn:           'English',
    company:          'Empresa',
    companyName:      'Nome da empresa',
    save:             'Salvar',
    saving:           'Salvando…',
    saved:            'Salvo!',
    security:         'Segurança',
    currentPassword:  'Senha atual',
    newPassword:      'Nova senha',
    confirmPassword:  'Confirmar nova senha',
    changePassword:   'Alterar senha',
    passwordChanged:  'Senha alterada com sucesso!',
    passwordMismatch: 'As senhas não coincidem.',
    errorGeneric:     'Ocorreu um erro. Tente novamente.',
  },
  en: {
    title:            'Settings',
    appearance:       'Appearance',
    darkMode:         'Dark mode',
    darkModeDesc:     'Switch between light and dark theme.',
    language:         'Language',
    languageDesc:     'Choose the interface language.',
    langPt:           'Português',
    langEn:           'English',
    company:          'Company',
    companyName:      'Company name',
    save:             'Save',
    saving:           'Saving…',
    saved:            'Saved!',
    security:         'Security',
    currentPassword:  'Current password',
    newPassword:      'New password',
    confirmPassword:  'Confirm new password',
    changePassword:   'Change password',
    passwordChanged:  'Password changed successfully!',
    passwordMismatch: 'Passwords do not match.',
    errorGeneric:     'An error occurred. Please try again.',
  },
} as const;

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const { theme, setTheme, lang, setLang } = useSettings();
  const t = T[lang];

  // Company name
  const [companyName, setCompanyName]     = useState('');
  const [nameStatus,  setNameStatus]      = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Password
  const [currentPwd,  setCurrentPwd]      = useState('');
  const [newPwd,       setNewPwd]          = useState('');
  const [confirmPwd,   setConfirmPwd]      = useState('');
  const [pwdStatus,    setPwdStatus]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pwdError,     setPwdError]        = useState('');

  // Load tenant name on mount
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
      setPwdError(t.passwordMismatch);
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
      const msg = err instanceof Error ? err.message : t.errorGeneric;
      setPwdError(msg);
      setPwdStatus('error');
      setTimeout(() => setPwdStatus('idle'), 2500);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
      </div>

      {/* ── Appearance ── */}
      <Section title={t.appearance}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {t.darkMode}
            </div>
            <p className="text-xs text-muted-foreground">{t.darkModeDesc}</p>
          </div>
          <Toggle
            checked={theme === 'dark'}
            onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        </div>
      </Section>

      {/* ── Language ── */}
      <Section title={t.language}>
        <p className="text-xs text-muted-foreground">{t.languageDesc}</p>
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
              {l === 'pt' ? t.langPt : t.langEn}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Company ── */}
      <Section title={t.company}>
        <form onSubmit={handleSaveName} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">{t.companyName}</label>
            <input
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
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
          >
            {nameStatus === 'saving' ? t.saving : nameStatus === 'saved' ? t.saved : t.save}
          </button>
        </form>
        {nameStatus === 'error' && (
          <p className="text-xs text-destructive">{t.errorGeneric}</p>
        )}
      </Section>

      {/* ── Security ── */}
      <Section title={t.security}>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.currentPassword}</label>
            <input
              type="password"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.newPassword}</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t.confirmPassword}</label>
            <input
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
            <p className="text-xs text-[hsl(var(--positive))]">{t.passwordChanged}</p>
          )}
          <button
            type="submit"
            disabled={pwdStatus === 'saving'}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {pwdStatus === 'saving' ? t.saving : t.changePassword}
          </button>
        </form>
      </Section>
    </div>
  );
}

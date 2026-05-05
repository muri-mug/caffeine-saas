'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Lang  = 'pt' | 'en';

interface SettingsContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  theme: 'light',
  setTheme: () => {},
  lang: 'pt',
  setLang: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [lang,  setLangState]  = useState<Lang>('pt');

  // Lê preferências salvas no primeiro render (client-only)
  useEffect(() => {
    const savedTheme = (localStorage.getItem('sarta_theme') as Theme) ?? 'light';
    const savedLang  = (localStorage.getItem('sarta_lang')  as Lang)  ?? 'pt';
    setThemeState(savedTheme);
    setLangState(savedLang);
    applyTheme(savedTheme);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('sarta_theme', t);
    applyTheme(t);
  }

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('sarta_lang', l);
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

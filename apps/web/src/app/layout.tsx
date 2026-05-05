import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SettingsProvider } from '@/lib/settings-context';
import './globals.css';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Sarta — Gestão Financeira',
  description: 'Inteligência financeira para cafeterias e estabelecimentos de alimentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}

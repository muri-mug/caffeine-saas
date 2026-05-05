export interface TenantTheme {
  primaryHsl: string;           // ex: "221 83% 53%"
  primaryForegroundHsl: string;
  radius?: string;              // ex: "0.375rem"
  fontSans?: string;
}

export function applyTenantTheme(theme: TenantTheme) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', theme.primaryHsl);
  root.style.setProperty('--brand-primary-foreground', theme.primaryForegroundHsl);
  root.style.setProperty('--primary', theme.primaryHsl);
  root.style.setProperty('--primary-foreground', theme.primaryForegroundHsl);
  if (theme.radius) root.style.setProperty('--radius', theme.radius);
  if (theme.fontSans) root.style.setProperty('--font-sans', theme.fontSans);
}

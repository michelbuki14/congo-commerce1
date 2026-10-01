import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(true);

  // Read the stored preference (falling back to whatever the document already
  // has) and keep React in sync with it, so the pressed state actually updates
  // when the visitor switches.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved
      ? saved === 'dark'
      : document.documentElement.classList.contains('dark');
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  // Explicit set, not a toggle: each button states which theme it selects.
  const applyTheme = (dark) => {
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t('theme.label')}>
      <button
        type="button"
        onClick={() => applyTheme(false)}
        aria-pressed={!isDark}
        aria-label={t('theme.light')}
        className={`rounded-full px-2.5 py-1 transition-colors ${!isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{t('theme.light')}</span>
      </button>
      <button
        type="button"
        onClick={() => applyTheme(true)}
        aria-pressed={isDark}
        aria-label={t('theme.dark')}
        className={`rounded-full px-2.5 py-1 transition-colors ${isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{t('theme.dark')}</span>
      </button>
    </div>
  );
}

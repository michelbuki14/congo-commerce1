import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  const isDark = document.documentElement.classList.contains('dark');

  const toggleTheme = () => {
    const newDark = !isDark;
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t('theme.label')}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={!isDark}
        aria-label={t('theme.light')}
        className={`rounded-full px-2.5 py-1 transition-colors ${!isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{t('theme.light')}</span>
      </button>
      <button
        type="button"
        onClick={toggleTheme}
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
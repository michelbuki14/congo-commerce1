import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/i18n';

/** Compact language picker. Mirrors CurrencyToggle styling. */
export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  return (
    <select
      aria-label="Langue / Language"
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={`h-10 cursor-pointer rounded-full border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none ${className}`}
    >
      {LANGUAGES.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label} · {l.name}
        </option>
      ))}
    </select>
  );
}

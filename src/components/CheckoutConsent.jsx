import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

export default function CheckoutConsent({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-primary" /> {t('consent.title')}
      </h2>
      <label className="flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          checked={value.terms}
          onChange={(e) => onChange({ ...value, terms: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-muted-foreground">
          {t('consent.termsA')}{' '}
          <Link to="/cgv" className="font-semibold text-primary">
            {t('consent.cgv')}
          </Link>{' '}
          {t('consent.termsB')}{' '}
          <Link to="/confidentialite" className="font-semibold text-primary">
            {t('consent.privacy')}
          </Link>
          . <span className="font-bold text-destructive">*</span>
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          checked={value.marketing}
          onChange={(e) => onChange({ ...value, marketing: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-muted-foreground">
          {t('consent.marketing')}
        </span>
      </label>
    </section>
  );
}
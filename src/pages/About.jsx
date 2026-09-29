import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">{t('about.title')}</h1>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('about.p1')}
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('about.p2')}
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('about.p3')}
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('about.contactPre')}{' '}
        <Link to="/contact" className="font-semibold text-foreground underline">
          {t('about.contactLink')}
        </Link>
        .
      </p>
    </div>
  );
}

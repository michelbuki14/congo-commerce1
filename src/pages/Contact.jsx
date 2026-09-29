import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, LifeBuoy, ShieldCheck } from 'lucide-react';
import { getCompanyConfig, loadPlatformConfig } from '@/lib/config';

export default function Contact() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(getCompanyConfig());

  useEffect(() => {
    loadPlatformConfig().then((cfg) => setCompany(cfg.company));
  }, []);

  const email = company.email || 'contact@congo-commerce.cd';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">{t('contact.title')}</h1>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('contact.intro')}
      </p>

      <div className="space-y-2">
        <a
          href={`mailto:${email}`}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">{t('contact.writeEmail')}</span>
            <span className="block text-xs text-muted-foreground">{email}</span>
          </span>
        </a>

        <Link
          to="/support"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">{t('contact.helpCenter')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('contact.helpCenterText')}
            </span>
          </span>
        </Link>

        <Link
          to="/confidentialite"
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold">{t('contact.dataRights')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('contact.dataRightsText')}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

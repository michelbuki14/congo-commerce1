import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

export default function Faq() {
  const { t } = useTranslation();
  const GROUPS = [
    {
      title: t('faq.g1Title'),
      items: [
        { q: t('faq.g1q1'), a: t('faq.g1a1') },
        { q: t('faq.g1q2'), a: t('faq.g1a2') },
        { q: t('faq.g1q3'), a: t('faq.g1a3') },
        { q: t('faq.g1q4'), a: t('faq.g1a4') },
      ],
    },
    {
      title: t('faq.g2Title'),
      items: [
        { q: t('faq.g2q1'), a: t('faq.g2a1') },
        { q: t('faq.g2q2'), a: t('faq.g2a2') },
        { q: t('faq.g2q3'), a: t('faq.g2a3') },
        { q: t('faq.g2q4'), a: t('faq.g2a4') },
      ],
    },
    {
      title: t('faq.g3Title'),
      items: [
        { q: t('faq.g3q1'), a: t('faq.g3a1') },
        { q: t('faq.g3q2'), a: t('faq.g3a2') },
        { q: t('faq.g3q3'), a: t('faq.g3a3') },
        { q: t('faq.g3q4'), a: t('faq.g3a4') },
      ],
    },
  ];
  return (
    <InfoPage
      icon={HelpCircle}
      title={t('faq.title')}
      subtitle={t('faq.subtitle')}
    >
      {GROUPS.map((group) => (
        <InfoSection key={group.title} title={group.title}>
          {group.items.map((item) => (
            <details key={item.q} className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">{item.q}</summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </InfoSection>
      ))}

      <InfoSection title={t('faq.moreTitle')}>
        <p>
          {t('faq.moreText')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/help-center" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            {t('faq.helpCenter')}
          </Link>
          <Link to="/support" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            {t('faq.contactSupport')}
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}

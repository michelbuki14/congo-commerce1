import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import ToggleRow from '@/components/settings/ToggleRow';
import useUserPrefs from '@/lib/useUserPrefs';

const DEFAULTS = { subscribed: false, weekly_deals: true, flash_sales: false, new_sellers: false, creator_picks: false };

export default function NewsletterSignup() {
  const { t } = useTranslation();
  const TYPES = [
    { id: 'weekly_deals', label: t('newsletterSignup.typeWeeklyDeals'), hint: t('newsletterSignup.typeWeeklyDealsHint') },
    { id: 'flash_sales', label: t('newsletterSignup.typeFlashSales'), hint: t('newsletterSignup.typeFlashSalesHint') },
    { id: 'new_sellers', label: t('newsletterSignup.typeNewSellers'), hint: t('newsletterSignup.typeNewSellersHint') },
    { id: 'creator_picks', label: t('newsletterSignup.typeCreatorPicks'), hint: t('newsletterSignup.typeCreatorPicksHint') },
  ];
  const { value, save, saving } = useUserPrefs('newsletter_prefs', DEFAULTS);
  if (!value) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage icon={Mail} title={t('newsletterSignup.title')} subtitle={t('newsletterSignup.subtitle')}>
      <InfoSection title={t('newsletterSignup.subTitle')}>
        <ToggleRow label={t('newsletterSignup.receiveNewsletter')} checked={value.subscribed} disabled={saving} onChange={(on) => save({ ...value, subscribed: on })} />
      </InfoSection>
      <InfoSection title={t('newsletterSignup.contentTypes')}>
        <div className={`divide-y divide-border ${value.subscribed ? '' : 'opacity-50'}`}>
          {TYPES.map((tx) => (
            <ToggleRow key={tx.id} label={tx.label} hint={tx.hint} checked={value[tx.id]} disabled={saving || !value.subscribed} onChange={(on) => save({ ...value, [tx.id]: on })} />
          ))}
        </div>
      </InfoSection>
    </InfoPage>
  );
}

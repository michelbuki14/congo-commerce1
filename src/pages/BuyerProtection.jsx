import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'];

export default function BuyerProtection() {
  const { t } = useTranslation();
  return (
    <InfoPage
      icon={ShieldCheck}
      title={t('buyerProtection.title')}
      subtitle={t('buyerProtection.subtitle')}
    >
      <InfoSection title={t('buyerProtection.covered')}>
        <ul className="space-y-1.5">
          <li>• {t('buyerProtection.cover1')}</li>
          <li>• {t('buyerProtection.cover2')}</li>
          <li>• {t('buyerProtection.cover3')}</li>
          <li>• {t('buyerProtection.cover4')}</li>
          <li>• {t('buyerProtection.cover5')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('buyerProtection.dispute')}>
        <div className="space-y-2">
          {STEP_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{t(`buyerProtection.${k}Title`)}</p>
              <p className="mt-1">{t(`buyerProtection.${k}Text`)}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/disputes" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            {t('buyerProtection.openDispute')}
          </Link>
          <Link to="/track" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            {t('buyerProtection.trackOrder')}
          </Link>
        </div>
      </InfoSection>

      <InfoSection title={t('buyerProtection.returns')}>
        <ul className="space-y-1.5">
          <li>• {t('buyerProtection.ret1')}</li>
          <li>• {t('buyerProtection.ret2')}</li>
          <li>• {t('buyerProtection.ret3')}</li>
          <li>• {t('buyerProtection.ret4')}</li>
          <li>• {t('buyerProtection.ret5')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('buyerProtection.after')}>
        <p>
          {t('buyerProtection.afterText')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/returns" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            {t('buyerProtection.requestReturn')}
          </Link>
          <Link to="/help-center" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            {t('buyerProtection.helpCenter')}
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}
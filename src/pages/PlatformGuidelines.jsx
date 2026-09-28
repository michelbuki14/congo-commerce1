import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, ShieldCheck, Ban, Store, Users, Megaphone, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const PROHIBITED_KEYS = ['weapons', 'meds', 'drugs', 'counterfeit', 'wildlife', 'hateful', 'data'];

export default function PlatformGuidelines() {
  const { t } = useTranslation();
  return (
    <InfoPage
      icon={ScrollText}
      title={t('platformGuidelines.title')}
      subtitle={t('platformGuidelines.subtitle')}
    >
      <InfoSection title={t('platformGuidelines.commitment')}>
        <p>
          {t('platformGuidelines.commitmentText')}
        </p>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.sellers')}>
        <ul className="space-y-1.5">
          <li>• {t('platformGuidelines.seller1')}</li>
          <li>• {t('platformGuidelines.seller2')}</li>
          <li>• {t('platformGuidelines.seller3')}</li>
          <li>• {t('platformGuidelines.seller4')}</li>
          <li>• {t('platformGuidelines.seller5')}</li>
          <li>• {t('platformGuidelines.seller6')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.prohibited')}>
        <div className="flex items-start gap-2">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <ul className="space-y-1.5">
            {PROHIBITED_KEYS.map((k) => (
              <li key={k}>• {t(`platformGuidelines.banned_${k}`)}</li>
            ))}
          </ul>
        </div>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.buyers')}>
        <ul className="space-y-1.5">
          <li>• {t('platformGuidelines.buyer1')}</li>
          <li>• {t('platformGuidelines.buyer2')}</li>
          <li>• {t('platformGuidelines.buyer3')}</li>
          <li>• {t('platformGuidelines.buyer4')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.creators')}>
        <ul className="space-y-1.5">
          <li>• {t('platformGuidelines.creator1')}</li>
          <li>• {t('platformGuidelines.creator2')}</li>
          <li>• {t('platformGuidelines.creator3')}</li>
          <li>• {t('platformGuidelines.creator4')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.protection')}>
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1.5">
            <p>• {t('platformGuidelines.prot1')}</p>
            <p>• {t('platformGuidelines.prot2')}</p>
            <p>• {t('platformGuidelines.prot3')}</p>
            <p>• {t('platformGuidelines.prot4')}</p>
            <p>
              {t('platformGuidelines.detailPrefix')} <Link to="/buyer-protection" className="font-semibold text-primary">{t('platformGuidelines.detailLink')}</Link>.
            </p>
          </div>
        </div>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.sanctions')}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1.5">
            <p>{t('platformGuidelines.sanctionsIntro')}</p>
            <p>{t('platformGuidelines.sanction1')}</p>
            <p>{t('platformGuidelines.sanction2')}</p>
            <p>{t('platformGuidelines.sanction3')}</p>
            <p>{t('platformGuidelines.sanction4')}</p>
          </div>
        </div>
      </InfoSection>

      <InfoSection title={t('platformGuidelines.report')}>
        <p>
          {t('platformGuidelines.reportText')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/support-tickets" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            <Megaphone className="h-3.5 w-3.5" /> {t('platformGuidelines.openTicket')}
          </Link>
          <Link to="/dispute-center" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            {t('platformGuidelines.disputeCenter')}
          </Link>
          <Link to="/seller-application" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            <Store className="h-3.5 w-3.5" /> {t('platformGuidelines.becomeSeller')}
          </Link>
          <Link to="/terms-of-service" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
            <Users className="h-3.5 w-3.5" /> {t('platformGuidelines.terms')}
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}
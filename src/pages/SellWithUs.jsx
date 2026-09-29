import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Store, BadgeCheck, Truck, Coins, Users, PackageCheck } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

const BENEFIT_IDS = [
  { icon: Coins, key: 'commission' },
  { icon: Truck, key: 'logistics' },
  { icon: PackageCheck, key: 'import' },
  { icon: Users, key: 'creators' },
];

const STEP_IDS = ['step1', 'step2', 'step3', 'step4'];

export default function SellWithUs() {
  const { t } = useTranslation();
  return (
    <InfoPage
      icon={Store}
      title={t('sellWithUs.title')}
      subtitle={t('sellWithUs.subtitle')}
    >
      <section className="grid gap-3 md:grid-cols-2">
        {BENEFIT_IDS.map((b) => (
          <div key={b.key} className="rounded-2xl border border-border bg-card p-4">
            <b.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-bold">{t(`sellWithUs.benefit_${b.key}_title`)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`sellWithUs.benefit_${b.key}_text`)}</p>
          </div>
        ))}
      </section>

      <InfoSection title={t('sellWithUs.verifyTitle')}>
        <div className="space-y-2">
          {STEP_IDS.map((id) => (
            <div key={id} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{t(`sellWithUs.${id}_title`)}</p>
              <p className="mt-1">{t(`sellWithUs.${id}_text`)}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection title={t('sellWithUs.prereqTitle')}>
        <ul className="space-y-1.5">
          <li>• {t('sellWithUs.prereq1')}</li>
          <li>• {t('sellWithUs.prereq2')}</li>
          <li>• {t('sellWithUs.prereq3')}</li>
          <li>• {t('sellWithUs.prereq4')}</li>
        </ul>
      </InfoSection>

      <InfoSection title={t('sellWithUs.commissionTitle')}>
        <p>
          {t('sellWithUs.commissionText')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/seller" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground">
            <BadgeCheck className="h-4 w-4" /> {t('sellWithUs.createShop')}
          </Link>
          <Link to="/contact" className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground">
            {t('sellWithUs.talkAdvisor')}
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}
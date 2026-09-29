import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LifeBuoy,
  HelpCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Search,
  Store,
  Banknote,
  Headphones,
} from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';

export default function HelpCenter() {
  const { t } = useTranslation();
  const TOPICS = [
    { icon: Search, title: t('helpCenter.topic1Title'), text: t('helpCenter.topic1Text'), to: '/track' },
    { icon: Truck, title: t('helpCenter.topic2Title'), text: t('helpCenter.topic2Text'), to: '/shipping-info' },
    { icon: RotateCcw, title: t('helpCenter.topic3Title'), text: t('helpCenter.topic3Text'), to: '/returns' },
    { icon: ShieldCheck, title: t('helpCenter.topic4Title'), text: t('helpCenter.topic4Text'), to: '/buyer-protection' },
    { icon: HelpCircle, title: t('helpCenter.topic5Title'), text: t('helpCenter.topic5Text'), to: '/faq' },
    { icon: MapPin, title: t('helpCenter.topic6Title'), text: t('helpCenter.topic6Text'), to: '/shipping-info' },
    { icon: Store, title: t('helpCenter.topic7Title'), text: t('helpCenter.topic7Text'), to: '/sell-with-us' },
    { icon: Banknote, title: t('helpCenter.topic8Title'), text: t('helpCenter.topic8Text'), to: '/payout-requests' },
  ];
  return (
    <InfoPage
      icon={LifeBuoy}
      title={t('helpCenter.title')}
      subtitle={t('helpCenter.subtitle')}
    >
      <section className="grid gap-3 md:grid-cols-2">
        {TOPICS.map((tx) => (
          <Link key={tx.title} to={tx.to} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
            <tx.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-bold">{tx.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tx.text}</p>
          </Link>
        ))}
      </section>

      <InfoSection title={t('helpCenter.humanHelp')}>
        <p>
          {t('helpCenter.humanHelpText')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
          >
            <Headphones className="h-4 w-4" /> {t('helpCenter.contactSupport')}
          </Link>
          <Link to="/faq" className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground">
            {t('helpCenter.viewFaq')}
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}

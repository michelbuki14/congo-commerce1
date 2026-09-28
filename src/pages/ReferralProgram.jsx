import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gift, MousePointerClick, ShoppingBag, Coins, Share2, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { useCurrency } from '@/lib/currency';

export default function ReferralProgram() {
  const { t } = useTranslation();
  const STEPS = [
    { title: t('referralProgram.step1Title'), text: t('referralProgram.step1Text') },
    { title: t('referralProgram.step2Title'), text: t('referralProgram.step2Text') },
    { title: t('referralProgram.step3Title'), text: t('referralProgram.step3Text') },
  ];
  const { format } = useCurrency();
  const [creator, setCreator] = useState(null);
  const [stats, setStats] = useState({ clicks: 0, conversions: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (me?.email) {
        const rows = await base44.entities.Creator.filter({ email: me.email }).catch(() => []);
        const found = rows[0] || null;
        setCreator(found);
        if (found) {
          const clicks = await base44.entities.AffiliateClick.filter({ creator_id: found.id }, '-created_date', 200).catch(() => []);
          setStats({
            clicks: clicks.length,
            conversions: clicks.filter((c) => c.converted).length,
            earned: clicks.reduce((s, c) => s + (Number(c.commission_usd) || 0), 0),
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(creator.referral_code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <InfoPage
      icon={Gift}
      title={t('referralProgram.title')}
      subtitle={t('referralProgram.subtitle')}
    >
      <InfoSection title={t('referralProgram.howItWorks')}>
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      ) : creator ? (
        <InfoSection title={t('referralProgram.myStats')}>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">{creator.name}</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{creator.referral_code}</span>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" /> {copied ? t('referralProgram.codeCopied') : t('referralProgram.copyCode')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl bg-secondary/60 p-3">
              <MousePointerClick className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{stats.clicks}</p>
              <p className="text-[11px]">{t('referralProgram.clicksAttr')}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{stats.conversions}</p>
              <p className="text-[11px]">{t('referralProgram.salesConverted')}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <Coins className="h-4 w-4 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{format(stats.earned)}</p>
              <p className="text-[11px]">{t('referralProgram.commissions')}</p>
            </div>
          </div>
          <p className="pt-1">
            {t('referralProgram.rateLine', { rate: creator.commission_rate || 8 })}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/creator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              {t('referralProgram.creatorSpace')}
            </Link>
            <Link to="/payout-requests" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              {t('referralProgram.withdrawCommissions')}
            </Link>
          </div>
        </InfoSection>
      ) : (
        <InfoSection title={t('referralProgram.becomeAffiliate')}>
          <p>
            {t('referralProgram.becomeAffiliateText')}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/creator" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              {t('referralProgram.joinProgram')}
            </Link>
            <Link to="/referral" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              {t('referralProgram.haveCode')}
            </Link>
          </div>
        </InfoSection>
      )}

      <InfoSection title={t('referralProgram.goodToKnow')}>
        <ul className="space-y-1.5">
          <li>{t('referralProgram.note1')}</li>
          <li>{t('referralProgram.note2')}</li>
          <li>{t('referralProgram.note3')}</li>
        </ul>
        <Link to="/creator-showcase" className="inline-block rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
          {t('referralProgram.topCreators')}
        </Link>
      </InfoSection>
    </InfoPage>
  );
}

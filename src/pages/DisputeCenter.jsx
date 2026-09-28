import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Gavel, RotateCcw } from 'lucide-react';
import DisputePanel from '@/components/disputes/DisputePanel';
import RefundPanel from '@/components/disputes/RefundPanel';

export default function DisputeCenter() {
  const { t } = useTranslation();
  const TABS = [
    { id: 'disputes', label: t('disputeCenter.tabDisputes'), icon: Gavel },
    { id: 'refunds', label: t('disputeCenter.tabRefunds'), icon: RotateCcw },
  ];
  const [tab, setTab] = useState('disputes');

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('disputeCenter.title')}</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('disputeCenter.protection')}
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold ${
              tab === tx.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            }`}
          >
            <tx.icon className="h-3.5 w-3.5" /> {tx.label}
          </button>
        ))}
      </div>

      {tab === 'disputes' ? <DisputePanel /> : <RefundPanel />}

      <p className="text-[11px] text-muted-foreground">
        {t('disputeCenter.helpPre')}{' '}
        <Link to="/buyer-protection" className="font-semibold text-primary">{t('disputeCenter.buyerProtection')}</Link> {t('disputeCenter.helpMid')}{' '}
        <Link to="/support-tickets" className="font-semibold text-primary">{t('disputeCenter.myTickets')}</Link>.
      </p>
    </div>
  );
}

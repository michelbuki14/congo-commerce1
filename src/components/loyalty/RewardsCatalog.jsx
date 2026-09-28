import React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Lock } from 'lucide-react';
import { LOYALTY_REWARDS } from '@/lib/loyalty';

/** Redeemable rewards, locked until the points balance covers them. */
export default function RewardsCatalog({ balance = 0, onRedeem, redeeming = '' }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gift className="h-4 w-4 text-primary" /> {t('rewardsCatalog.title')}
        </h2>
        <p className="text-[11px] text-muted-foreground">
          {t('rewardsCatalog.desc')}
        </p>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {LOYALTY_REWARDS.map((reward) => {
          const locked = balance < reward.points;
          return (
            <div key={reward.code} className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${locked ? 'border-dashed border-border opacity-70' : 'border-border'}`}>
              <div className="min-w-0">
                <p className="text-xs font-semibold">{reward.label}</p>
                <p className="text-[11px] text-muted-foreground">{reward.note}</p>
                <p className="mt-1 text-[11px] font-bold text-primary">{t('rewardsCatalog.points', { count: reward.points.toLocaleString('fr-FR') })}</p>
              </div>
              <button
                type="button"
                disabled={locked || redeeming === reward.code}
                onClick={() => onRedeem(reward)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold disabled:opacity-60 ${
                  locked ? 'bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {locked ? <Lock className="h-3.5 w-3.5" /> : redeeming === reward.code ? '…' : t('rewardsCatalog.redeem')}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
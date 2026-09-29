import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Trophy } from 'lucide-react';

/** Membership tier, points balance and progress to the next level. */
export default function LoyaltyTierCard({ summary }) {
  const { t } = useTranslation();
  const { tier, next, balance, pending, missingToNext, progress, lifetimeUsd, affordable } = summary;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Trophy className="h-4 w-4 text-primary" /> {t('loyaltyTierCard.status', { tier: t(tier.nameKey) })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {tier.multiplier > 1 ? t('loyaltyTierCard.multiplier', { multi: tier.multiplier }) : t('loyaltyTierCard.starter')}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tier.badge}`}>{tier.code}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { label: t('loyaltyTierCard.availPoints'), value: balance.toLocaleString('fr-FR') },
          { label: t('loyaltyTierCard.pendingPoints'), value: pending.toLocaleString('fr-FR') },
          { label: t('loyaltyTierCard.rewards'), value: String(affordable) },
          { label: t('loyaltyTierCard.totalSpent'), value: `$${lifetimeUsd.toFixed(2)}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-secondary/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {next ? (
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold">{t('loyaltyTierCard.nextLevel', { name: next.name })}</span>
            <span className="text-muted-foreground">{t('loyaltyTierCard.pointsToGo', { count: missingToNext.toLocaleString('fr-FR') })}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" /> {t('loyaltyTierCard.maxLevel')}
        </p>
      )}

      <ul className="space-y-1 text-[11px] text-muted-foreground">
        {t(tier.perksKey, { returnObjects: true }).map((perk) => (
          <li key={perk}>• {perk}</li>
        ))}
      </ul>
    </section>
  );
}
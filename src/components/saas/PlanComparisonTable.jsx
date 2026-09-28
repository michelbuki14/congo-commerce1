import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FEATURE_LABELS, planAmountLabel, planLimit } from '@/lib/plans';

/** Plan grid: price, commission, limits and tools, with a one-click switch. */
export default function PlanComparisonTable({ plans, currentCode, cycle, busy, onChoose }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const current = plan.code === currentCode;
        return (
          <section
            key={plan.id || plan.code}
            className={`flex min-w-0 flex-col rounded-2xl border bg-card p-4 ${
              current ? 'border-primary ring-1 ring-primary' : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{plan.name}</h2>
              {current ? (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">{t('planComparisonTable.currentPlan')}</span>
              ) : plan.highlighted ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                  <Sparkles className="h-3 w-3" /> {t('planComparisonTable.recommended')}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xl font-bold">
              {planAmountLabel(plan, cycle)}
              {plan.code !== 'ENTERPRISE' && Number(cycle === 'yearly' ? plan.price_yearly_usd : plan.price_monthly_usd) > 0 ? (
                <span className="text-xs font-normal text-muted-foreground">/{cycle === 'yearly' ? t('planComparisonTable.perYear') : t('planComparisonTable.perMonth')}</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{plan.description}</p>

            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-[11px] font-semibold">
              {t('planComparisonTable.commission', { rate: Number(plan.commission_rate) || 0 })}
            </p>

            <ul className="mt-3 space-y-1.5 text-[11px]">
              <li>{t('planComparisonTable.products', { count: planLimit(plan, 'product_limit').toLocaleString('fr-FR') })}</li>
              <li>{t('planComparisonTable.stores', { count: planLimit(plan, 'store_limit').toLocaleString('fr-FR') })}</li>
              <li>{t('planComparisonTable.sellers', { count: planLimit(plan, 'seller_limit').toLocaleString('fr-FR') })}</li>
              <li>{t('planComparisonTable.members', { count: planLimit(plan, 'member_limit').toLocaleString('fr-FR') })}</li>
              <li>{t('planComparisonTable.trial', { count: Number(plan.trial_days) || 0 })}</li>
            </ul>

            <ul className="mt-3 flex-1 space-y-1.5 text-[11px] text-muted-foreground">
              {(plan.features || []).map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {FEATURE_LABELS[f] || f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={busy || current}
              onClick={() => onChoose(plan)}
              className={`mt-4 rounded-full px-4 py-2.5 text-xs font-semibold disabled:opacity-60 ${
                current ? 'border border-border' : 'bg-primary text-primary-foreground'
              }`}
            >
              {current ? t('planComparisonTable.inProgress') : t('planComparisonTable.choose', { name: plan.name })}
            </button>
          </section>
        );
      })}
    </div>
  );
}
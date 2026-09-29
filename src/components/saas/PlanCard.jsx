import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { PLAN_FEATURES, hasFeature, planAmountLabel } from '@/lib/plans';

export default function PlanCard({ plan, cycle = 'monthly', current, onSelect, ctaLabel, disabled = false }) {
  const { t } = useTranslation();
  const isCurrent = current && current === plan.code;
  return (
    <Card className={`flex h-full flex-col ${plan.highlighted ? 'border-primary ring-1 ring-primary' : ''}`}>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
            {plan.highlighted && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{t('planCard.recommended')}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{planAmountLabel(plan, cycle)}</p>
          <p className="text-xs text-muted-foreground">
            {plan.code === 'ENTERPRISE' ? t('planCard.negotiated') : cycle === 'yearly' ? t('planCard.perYear') : t('planCard.perMonth')}
            {' · '}{t('planCard.commission', { rate: plan.commission_rate })}
          </p>
        </div>

        <ul className="space-y-1.5 border-y border-border py-3 text-sm">
          <li>{t('planCard.products', { count: plan.product_limit.toLocaleString('fr-FR') })}</li>
          <li>{t('planCard.storesSellers', { stores: plan.store_limit, sellers: plan.seller_limit })}</li>
          <li>{t('planCard.members', { count: plan.member_limit })}</li>
        </ul>

        <ul className="flex-1 space-y-1.5 text-sm">
          {PLAN_FEATURES.map((f) => {
            const on = hasFeature(plan, f.key);
            return (
              <li key={f.key} className={`flex items-center gap-2 ${on ? '' : 'text-muted-foreground'}`}>
                {on ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 opacity-50" />}
                {f.label}
              </li>
            );
          })}
        </ul>

        {onSelect && (
          <Button onClick={() => onSelect(plan)} disabled={disabled || isCurrent} className="w-full">
            {isCurrent ? t('planCard.currentPlan') : (ctaLabel || t('planCard.choose'))}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
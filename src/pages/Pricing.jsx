import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import PlanCard from '@/components/saas/PlanCard';
import { loadPlans } from '@/lib/plans';
import { BILLING_CYCLES } from '@/lib/saas';

export default function Pricing() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans().then((rows) => {
      setPlans(rows);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 py-2">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">{t('pricing.title')}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {t('pricing.subtitle')}
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1">
          {BILLING_CYCLES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCycle(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${cycle === c.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {c.label}{c.id === 'yearly' ? t('pricing.yearlySuffix') : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              cycle={cycle}
              ctaLabel={t('pricing.cta')}
              onSelect={() => { window.location.href = `/tenant-onboarding?plan=${plan.code}&cycle=${cycle}`; }}
            />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{t('pricing.includedTitle')}</p>
          <p>{t('pricing.includedText')}</p>
          <p>
            {t('pricing.question')} <Link to="/contact" className="font-semibold text-foreground underline">{t('pricing.talkAdvisor')}</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { memo } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Eye } from 'lucide-react';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

const LEVEL_STYLE = {
  low: 'bg-secondary text-foreground',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-100 text-orange-900',
  critical: 'bg-red-100 text-red-900',
};

export default memo(function FraudReviewQueue({ events, busyId, onReview }) {
  const { t } = useTranslation();
  const LEVEL_LABEL = { low: t('fraudReviewQueue.levelLow'), medium: t('fraudReviewQueue.levelMedium'), high: t('fraudReviewQueue.levelHigh'), critical: t('fraudReviewQueue.levelCritical') };
  const STATUS_LABEL = {
    open: t('fraudReviewQueue.statusOpen'),
    reviewing: t('fraudReviewQueue.statusReviewing'),
    cleared: t('fraudReviewQueue.statusCleared'),
    confirmed: t('fraudReviewQueue.statusConfirmed'),
    blocked: t('fraudReviewQueue.statusBlocked'),
  };
  const ACTIONS = [
    { status: 'reviewing', label: t('fraudReviewQueue.actionReview'), icon: Eye },
    { status: 'cleared', label: t('fraudReviewQueue.actionClear'), icon: ShieldCheck },
    { status: 'confirmed', label: t('fraudReviewQueue.actionConfirm'), icon: ShieldX },
    { status: 'blocked', label: t('fraudReviewQueue.actionBlock'), icon: ShieldAlert },
  ];
  if (!events.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
        {t('fraudReviewQueue.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div key={e.id} className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEVEL_STYLE[e.risk_level] || LEVEL_STYLE.low}`}>
              {LEVEL_LABEL[e.risk_level] || e.risk_level} · {e.risk_score}
            </span>
            <span className="text-sm font-semibold">{e.order_number || t('fraudReviewQueue.noOrder')}</span>
            <span className="text-xs text-muted-foreground">{formatUSD(e.amount_usd)}</span>
            <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
              {STATUS_LABEL[e.status] || e.status}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {[e.customer_name, e.customer_phone, e.customer_email].filter(Boolean).join(' · ') || t('fraudReviewQueue.unknownCustomer')}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(e.signals || []).map((s, i) => (
              <span key={i} className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                {s.label} (+{s.points})
              </span>
            ))}
            {!e.signals?.length && <span className="text-[10px] text-muted-foreground">{t('fraudReviewQueue.noSignals')}</span>}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ACTIONS.map((a) => (
              <button
                key={a.status}
                type="button"
                disabled={busyId === e.id || e.status === a.status}
                onClick={() => onReview(e, a.status)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
              >
                <a.icon className="h-3.5 w-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
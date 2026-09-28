import React from 'react';
import { useTranslation } from 'react-i18next';
import { HEALTH_LABELS } from '@/lib/platformHealth';

const DOT = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  unknown: 'bg-slate-300',
};

const PILL = {
  ok: 'bg-emerald-100 text-emerald-900',
  degraded: 'bg-amber-100 text-amber-900',
  down: 'bg-red-100 text-red-900',
  unknown: 'bg-slate-200 text-slate-700',
};

/** One monitored service, gateway or logistics partner. */
export default function ServiceStatusRow({ name, detail, meta, status = 'unknown', right }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[status] || DOT.unknown}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-muted-foreground">{detail}</p>
          {meta ? <p className="text-[11px] text-muted-foreground">{meta}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PILL[status] || PILL.unknown}`}>
          {t(HEALTH_LABELS[status] || 'healthStatus.unknown')}
        </span>
      </div>
    </div>
  );
}
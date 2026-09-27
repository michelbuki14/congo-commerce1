import React from 'react';

/** Small KPI tile shared by the operations dashboards. */
const TONES = {
  default: 'bg-card',
  good: 'bg-emerald-50',
  warn: 'bg-amber-50',
  bad: 'bg-red-50',
};

export default function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <div className={`rounded-2xl border border-border p-3.5 ${TONES[tone] || TONES.default}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold leading-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
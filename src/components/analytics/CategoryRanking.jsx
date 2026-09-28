import React from 'react';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

/** Top-selling product categories, ranked by revenue. */
export default function CategoryRanking({ categories }) {
  const { t } = useTranslation();
  const top = categories[0]?.revenue || 0;
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold">{t('categoryRanking.title')}</h2>
        <p className="text-[11px] text-muted-foreground">{t('categoryRanking.subtitle')}</p>
      </header>
      <div className="divide-y divide-border">
        {categories.length ? categories.map((c, i) => (
          <div key={c.name} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-4 font-bold text-muted-foreground">{i + 1}</span>
                <span className="truncate font-semibold">{c.name}</span>
              </span>
              <span className="shrink-0 font-bold">{formatUSD(c.revenue)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${top ? Math.max(4, Math.round(c.revenue / top * 100)) : 0}%` }} />
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{t('categoryRanking.units', { count: c.units })}</span>
            </div>
          </div>
        )) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('categoryRanking.empty')}</p>
        )}
      </div>
    </section>
  );
}
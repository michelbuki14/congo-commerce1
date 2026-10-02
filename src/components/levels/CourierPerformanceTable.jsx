import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

/** Per-courier delivery performance against the delay each partner promises. */
export default memo(function CourierPerformanceTable({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) {
    return <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t('courierPerformanceTable.empty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colPartner')}</th>
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colDelivered')}</th>
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colAvg')}</th>
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colTarget')}</th>
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colDelta')}</th>
            <th className="px-4 py-2 font-semibold">{t('courierPerformanceTable.colOpen')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-4 py-2.5 font-semibold">{r.name}</td>
              <td className="px-4 py-2.5">{r.delivered}</td>
              <td className="px-4 py-2.5">{r.avgDays != null ? t('courierPerformanceTable.days', { count: r.avgDays }) : '—'}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.target != null ? t('courierPerformanceTable.days', { count: r.target }) : '—'}</td>
              <td className="px-4 py-2.5">
                {r.delta == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${r.onTime ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                    {r.delta > 0 ? t('courierPerformanceTable.deltaPlus', { count: r.delta }) : t('courierPerformanceTable.days', { count: r.delta })}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">{r.open}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
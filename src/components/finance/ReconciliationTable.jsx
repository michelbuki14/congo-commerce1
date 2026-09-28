import React from 'react';
import { formatUSD } from '@/lib/format';
import { useTranslation } from 'react-i18next';

/** Per payment-method totals: collected vs still awaiting payment. */
export default function ReconciliationTable({ rows }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">{t('reconciliationTable.method')}</th>
            <th className="p-3">{t('reconciliationTable.orders')}</th>
            <th className="p-3">{t('reconciliationTable.collected')}</th>
            <th className="p-3">{t('reconciliationTable.pending')}</th>
            <th className="p-3">{t('reconciliationTable.failed')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.provider} className="border-t border-border">
              <td className="p-3 font-semibold">{r.label}</td>
              <td className="p-3">{r.count}</td>
              <td className="p-3 font-semibold text-emerald-700">{formatUSD(r.paid)}</td>
              <td className="p-3 text-amber-700">{formatUSD(r.pending)}</td>
              <td className="p-3 text-muted-foreground">{formatUSD(r.failed)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t('reconciliationTable.empty')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
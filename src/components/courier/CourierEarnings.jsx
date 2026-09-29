import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet as WalletIcon } from 'lucide-react';
import { formatUSD, formatDate } from '@/lib/format';

export default function CourierEarnings({ wallet, transactions }) {
  const { t } = useTranslation();
  const delivered = transactions.filter((t) => t.status === 'posted').length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <WalletIcon className="h-4 w-4 text-primary" /> {t('courierEarnings.title')}
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] text-muted-foreground">{t('courierEarnings.balance')}</p>
          <p className="text-lg font-bold">{formatUSD(wallet?.balance_usd || 0)}</p>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] text-muted-foreground">{t('courierEarnings.total')}</p>
          <p className="text-lg font-bold">{formatUSD(wallet?.lifetime_credit_usd || 0)}</p>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] text-muted-foreground">{t('courierEarnings.paidTrips')}</p>
          <p className="text-lg font-bold">{delivered}</p>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium">{t.description}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(t.created_date)}</p>
              </div>
              <span className="text-xs font-semibold text-primary">+{formatUSD(t.amount_usd)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
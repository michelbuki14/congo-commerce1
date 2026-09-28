import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { formatUSD, formatDate } from '@/lib/format';

export default function Coupons() {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  function describe(c) {
    if (c.type === 'percent') {
      return c.max_discount_usd
        ? t('coupons.percentOffMax', { value: c.value, max: formatUSD(c.max_discount_usd) })
        : t('coupons.percentOff', { value: c.value });
    }
    if (c.type === 'fixed') return t('coupons.fixedOff', { value: formatUSD(c.value) });
    return t('coupons.freeShip');
  }

  useEffect(() => {
    base44.entities.Coupon.filter({ active: true }, '-created_date', 30)
      .then((rows) => setCoupons(rows.filter((c) => !c.expires_at || new Date(c.expires_at) > new Date())))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('coupons.title')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('coupons.subtitle')}
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : coupons.length ? (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
              <Ticket className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{c.code}</p>
                <p className="text-xs text-muted-foreground">{describe(c)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.min_order_usd > 0 ? t('coupons.minOrder', { min: formatUSD(c.min_order_usd) }) : ''}
                  {c.expires_at ? t('coupons.expiresOn', { date: formatDate(c.expires_at) }) : t('coupons.noExpiry')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy(c.code)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
              >
                {copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === c.code ? t('coupons.copied') : t('coupons.copy')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Ticket} title={t('coupons.emptyTitle')} description={t('coupons.emptyText')} />
      )}
    </div>
  );
}

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from '@/components/ui/image';
import { formatUSD } from '@/lib/format';
import { splitVat } from '@/lib/tax';
import CheckoutConsent from '@/components/CheckoutConsent';

/** Step 3 — final summary, tax breakdown, consent, then pay. */
export default memo(function StepReview({ quote, loadingQuote, coupon, vatRate, currency, consent, setConsent }) {
  const { t } = useTranslation();
  return (
    <>
      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('checkout.summary')}</h2>
        {loadingQuote || !quote ? (
          <div className="h-24 animate-pulse rounded-lg bg-secondary" />
        ) : (
          <>
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {quote.lines.map((l) => (
                <div key={`${l.product.id}-${l.variant || ''}`} className="flex items-center gap-2">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <Image src={l.product.images?.[0]} alt={l.product.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{l.product.title}</p>
                    <p className="text-[11px] text-muted-foreground">× {l.quantity}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold">{formatUSD(l.line_total_usd)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-border pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
                <span className="font-semibold">{formatUSD(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{t('checkout.discount', { code: coupon?.code })}</span>
                  <span className="font-semibold">-{formatUSD(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('checkout.shipping')}</span>
                <span className="font-semibold">{quote.shipping === 0 ? t('checkout.freeShipping') : formatUSD(quote.shipping)}</span>
              </div>
              {vatRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkout.vatIncl', { rate: vatRate })}</span>
                  <span className="font-semibold">{formatUSD(splitVat(quote.total, vatRate).vat)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>{t('checkout.total')}</span>
                <span className="text-primary">{formatUSD(quote.total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('checkout.serverPriced', { currency })}
              </p>
            </div>
          </>
        )}
      </section>

      <CheckoutConsent value={consent} onChange={setConsent} />
    </>
  );
});
import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import MobileMoneyField from '@/components/checkout/MobileMoneyField';

/** Step 2 — how the buyer pays, and any promo code. */
export default function StepPayment({
  providers,
  paymentMethod,
  setPaymentMethod,
  isMobileMoney,
  payPhone,
  setPayPhone,
  couponInput,
  setCouponInput,
  applyCoupon,
  coupon,
  couponMessage,
}) {
  return (
    <>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Moyen de paiement</h2>
        <div className="space-y-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaymentMethod(p.id)}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-3 text-left ${
                paymentMethod === p.id ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${paymentMethod === p.id ? 'border-primary bg-primary' : 'border-border'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.instructions}</p>
              </div>
              {p.feePercent > 0 && <span className="shrink-0 text-[11px] text-muted-foreground">{p.feePercent}%</span>}
            </button>
          ))}
        </div>

        {isMobileMoney && (
          <MobileMoneyField
            providerId={paymentMethod}
            value={payPhone}
            onChange={setPayPhone}
            showError={payPhone.replace(/\D/g, '').length >= 9}
          />
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Ticket className="h-4 w-4 text-primary" /> Code promo
        </h2>
        <div className="flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Saisissez votre code"
            autoCapitalize="characters"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm uppercase"
          />
          <button type="button" onClick={applyCoupon} className="min-h-[44px] shrink-0 rounded-lg bg-secondary px-4 text-sm font-semibold">
            Appliquer
          </button>
        </div>
        {couponMessage && (
          <p className={`text-xs ${coupon ? 'text-emerald-600' : 'text-destructive'}`}>{couponMessage}</p>
        )}
        <Link to="/coupons" className="inline-block text-xs font-semibold text-primary">
          Voir les codes disponibles
        </Link>
      </section>
    </>
  );
}
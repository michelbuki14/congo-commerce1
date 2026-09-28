import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Store, Truck, Split } from 'lucide-react';
import { getCities } from '@/lib/config';
import { formatUSD } from '@/lib/format';

const FIELD = 'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm';

/** Step 1 — who the buyer is and where the order goes. */
export default function StepDelivery({
  profile,
  setProfile,
  deliveryMethod,
  setDeliveryMethod,
  pickupPoints,
  pickupPointId,
  setPickupPointId,
  notes,
  setNotes,
  groups,
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <MapPin className="h-4 w-4 text-primary" /> {t('checkout.deliveryTitle')}
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          placeholder={t('checkout.fullName')}
          aria-label={t('checkout.fullName')}
          autoComplete="name"
          className={FIELD}
        />
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          placeholder={t('checkout.phonePlaceholder')}
          aria-label={t('checkout.phonePlaceholder')}
          className={FIELD}
        />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={profile.email || ''}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          placeholder={t('checkout.emailOptional')}
          aria-label={t('checkout.emailOptional')}
          className={FIELD}
        />
        <select
          aria-label="Ville de livraison"
          value={profile.city}
          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
          className={FIELD}
        >
          {getCities().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'home_delivery', key: 'checkout.homeDelivery', icon: Truck },
          { id: 'pickup_point', key: 'checkout.pickupPoint', icon: Store },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setDeliveryMethod(m.id)}
            aria-pressed={deliveryMethod === m.id}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold ${
              deliveryMethod === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
            }`}
          >
            <m.icon className="h-4 w-4" /> {t(m.key)}
          </button>
        ))}
      </div>

      {deliveryMethod === 'home_delivery' ? (
        <textarea
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          rows={2}
          placeholder={t('checkout.addressPlaceholder')}
          aria-label={t('checkout.addressPlaceholder')}
          autoComplete="street-address"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
      ) : (
        <div className="space-y-2">
          {pickupPoints.length ? (
            pickupPoints.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPickupPointId(p.id)}
                className={`flex min-h-[56px] w-full items-start gap-3 rounded-xl border p-3 text-left ${
                  pickupPointId === p.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.address}, {p.commune} · {p.hours}</p>
                </div>
                <span className="text-xs font-semibold">{formatUSD(p.fee_usd || 0)}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">{t('checkout.noPickup')}</p>
          )}
        </div>
      )}

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('checkout.notesPlaceholder')}
        aria-label={t('checkout.notesPlaceholder')}
        className={FIELD}
      />

      {!!groups.length && (
        <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
          <h3 className="flex items-center gap-2 text-xs font-bold">
            <Split className="h-3.5 w-3.5 text-primary" /> {t('checkout.splitTitle', { count: groups.length })}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t('checkout.splitDesc')}
          </p>
          {groups.map((g) => (
            <div key={g.label} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-medium">{g.label}</span>
              <span className="shrink-0 text-muted-foreground">{g.intl ? t('checkout.intl') : t('checkout.localDrc')} · {t('checkout.itemCount', { count: g.count })}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
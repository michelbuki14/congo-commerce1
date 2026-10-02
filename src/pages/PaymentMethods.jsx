import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, CreditCard, Trash2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DRC_NETWORKS } from '@/lib/mobileMoney';
import MobileMoneyForm from '@/components/payments/MobileMoneyForm';
import BackButton from '@/components/BackButton';

const mask = (p) => `${p.slice(0, 4)} ••• ••${p.slice(-3)}`;

export default function PaymentMethods() {
  const { t } = useTranslation();
  const [methods, setMethods] = useState(null);
  useEffect(() => { base44.auth.me().then((me) => setMethods(me.payment_methods || [])); }, []);

  const persist = async (next) => { await base44.auth.updateMe({ payment_methods: next }); setMethods(next); };
  const add = (m) => persist([...methods, { ...m, id: crypto.randomUUID(), is_default: methods.length === 0, added_at: new Date().toISOString() }]);
  const remove = (id) => {
    const next = methods.filter((m) => m.id !== id);
    if (next.length && !next.some((m) => m.is_default)) next[0] = { ...next[0], is_default: true };
    persist(next);
  };
  const makeDefault = (id) => persist(methods.map((m) => ({ ...m, is_default: m.id === id })));

  return (<div className="mx-auto max-w-2xl space-y-5 px-4 py-5 pb-24">
        <BackButton fallback="/profile" className="md:hidden" />
      <h1 className="text-lg font-bold">{t('payout.savedMethodsTitle')}</h1>
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Smartphone className="h-4 w-4" /> Mobile money</p>
        {!methods ? <div className="h-16 animate-pulse rounded-xl bg-secondary" /> : methods.length === 0 ? (
          <p className="mb-3 text-xs text-muted-foreground">{t('payout.noSavedMethods')}</p>
        ) : (
          <div className="mb-4 divide-y divide-border">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 text-xs">
                <div className="flex-1">
                  <p className="font-bold">{DRC_NETWORKS.find((n) => n.providerId === m.provider)?.name} · {mask(m.phone)}</p>
                  <p className="text-muted-foreground">{m.holder}</p>
                </div>
                {m.is_default ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{t('payout.isDefault')}</span>
                  : <button onClick={() => makeDefault(m.id)} className="text-[11px] font-semibold underline">{t('payout.makeDefault')}</button>}
                <button onClick={() => remove(m.id)} aria-label={t('payout.removeMethod')} className="p-1.5"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
        {methods && <MobileMoneyForm onAdd={add} />}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4" /> {t('payout.bankCards')}</p>
        <p className="text-xs text-muted-foreground">{t('payout.bankCardsNote')}</p>
      </section>
      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" /> {t('payout.methodsPrivacy')}
      </p>
    </div>
  );
}
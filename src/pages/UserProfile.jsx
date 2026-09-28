import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/ops/StatCard';
import ContactForm from '@/components/profile/ContactForm';

export default function UserProfile() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState(null);

  const loadUser = () => base44.auth.me().then(setUser);
  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      base44.entities.Order.filter({ customer_email: me.email }, '-created_date', 50).then(setOrders);
    });
  }, []);

  if (!user) return <div className="mx-auto mt-6 h-60 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;
  const spent = (orders || []).filter((o) => o.payment_status === 'PAID').reduce((s, o) => s + (o.total_usd || 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-24">
      <div>
        <h1 className="text-lg font-bold">{t('userProfile.hello', { commaName: user.full_name ? `, ${user.full_name.split(' ')[0]}` : '' })}</h1>
        <p className="text-xs text-muted-foreground">{t('userProfile.memberSince', { date: new Date(user.created_date).toLocaleDateString('fr-FR') })}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('userProfile.accountStatus')} value={t('userProfile.active')} tone="good" hint={user.role === 'admin' ? t('userProfile.adminRole') : t('userProfile.clientRole')} />
        <StatCard label={t('userProfile.orders')} value={orders?.length ?? '–'} />
        <StatCard label={t('userProfile.totalPaid')} value={`${spent.toFixed(2)} $`} />
      </div>
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">{t('userProfile.myDetails')}</p>
        <ContactForm user={user} onSaved={loadUser} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">{t('userProfile.purchaseHistory')}</p>
        {!orders ? <div className="h-24 animate-pulse rounded-xl bg-secondary" /> : orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('userProfile.noOrdersFor', { email: user.email })}</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <Link key={o.id} to={`/order/${o.order_number}`} className="flex flex-wrap items-center gap-2 py-2.5 text-xs">
                <span className="font-bold">{o.order_number}</span>
                <span className="text-muted-foreground">{new Date(o.created_date).toLocaleDateString('fr-FR')}</span>
                <StatusBadge status={o.status} />
                <span className="ml-auto font-semibold">{(o.total_usd || 0).toFixed(2)} $ <span className="font-normal text-muted-foreground">{t('userProfile.vatIncl', { vat: (o.vat_usd || 0).toFixed(2) })}</span></span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="mb-1 text-sm font-bold text-foreground">{t('userProfile.yourData')}</p>
        {t('userProfile.dataTextPre')}{' '}
        <Link to="/privacy-settings" className="font-semibold underline">{t('userProfile.privacyLink')}</Link>{t('userProfile.dataTextMid')}<Link to="/confidentialite" className="underline">{t('userProfile.policyLink')}</Link>.
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Wallet, Ticket, Gift, RotateCcw, Bell, Headphones, Heart, MapPin, Save, Store, ShieldCheck, Sparkles, Truck, Gavel,
} from 'lucide-react';
import { fetchMyOrders } from '@/lib/customerAccount';
import { getProfile, saveProfile } from '@/lib/session';
import { getCities } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD, formatDate } from '@/lib/format';
import BackButton from '@/components/BackButton';

export default function Profile() {
  const { t } = useTranslation();
  const LINKS = [
    { to: '/wallet', label: t('profile.linkWallet'), icon: Wallet },
    { to: '/coupons', label: t('profile.linkCoupons'), icon: Ticket },
    { to: '/referral', label: t('profile.linkReferral'), icon: Gift },
    { to: '/returns', label: t('profile.linkReturns'), icon: RotateCcw },
    { to: '/dispute-center', label: t('profile.linkDisputes'), icon: Gavel },
    { to: '/notifications', label: t('profile.linkNotifications'), icon: Bell },
    { to: '/wishlist', label: t('profile.linkWishlist'), icon: Heart },
    { to: '/track', label: t('profile.linkTrack'), icon: MapPin },
    { to: '/support', label: t('profile.linkSupport'), icon: Headphones },
  ];
  const [profile, setProfile] = useState(getProfile());
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchMyOrders({ limit: 10 })
      .then((rows) => setOrders(rows))
      .finally(() => setLoadingOrders(false));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = () => {
    if (window.confirm(t('profile.deleteConfirm'))) {
      // TODO: Call backend cleanup function
      alert(t('profile.deleteSuccess'));
      window.location.href = '/';
    }
  };

    return (
      <div className="space-y-5 pb-6">
        <BackButton fallback="/" className="md:hidden" />
        <h1 className="text-lg font-bold md:text-xl">{t('profile.title')}</h1>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('profile.myInfo')}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder={t('profile.namePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder={t('profile.phonePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder={t('profile.emailPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <select
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {getCities().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <textarea
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            rows={2}
            placeholder={t('profile.addressPh')}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <button type="submit" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" /> {saved ? t('profile.saved') : t('profile.save')}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {t('profile.localNote')}
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('profile.myOrders')}</h2>
        {loadingOrders ? (
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
        ) : orders.length ? (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/order/${o.order_number}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">{o.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(o.created_date)} · {t('profile.shipmentsLine', { count: o.fulfillment_count || 1 })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-semibold">{formatUSD(o.total_usd)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('profile.noOrders')}</p>
        )}
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-sm font-medium"
          >
            <l.icon className="h-4 w-4 text-primary" />
            {l.label}
          </Link>
        ))}
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        <Link to="/seller" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <Store className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t('profile.sellerSpace')}</p>
            <p className="text-[11px] text-muted-foreground">{t('profile.sellerSub')}</p>
          </div>
        </Link>
        <Link to="/creator" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t('profile.creatorSpace')}</p>
            <p className="text-[11px] text-muted-foreground">{t('profile.creatorSub')}</p>
          </div>
        </Link>
        <Link to="/courier" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <Truck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t('profile.courierSpace')}</p>
            <p className="text-[11px] text-muted-foreground">{t('profile.courierSub')}</p>
          </div>
        </Link>
        <Link to="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{t('profile.adminSpace')}</p>
            <p className="text-[11px] text-muted-foreground">{t('profile.adminSub')}</p>
          </div>
        </Link>
        <Link to="#" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-red-500" onClick={handleDeleteAccount}>
          <RotateCcw className="h-4 w-4 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-500">{t('profile.deleteAccount')}</p>
            <p className="text-[11px] text-muted-foreground">{t('profile.deleteAccountSub')}</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
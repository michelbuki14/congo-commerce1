import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Ticket, Gift, RotateCcw, Bell, Headphones, Heart, MapPin, Save, Store, ShieldCheck, Sparkles, Truck, Gavel,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getProfile, saveProfile, getOrderIds } from '@/lib/session';
import { getCities } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD, formatDate } from '@/lib/format';

const LINKS = [
  { to: '/wallet', label: 'Mon portefeuille', icon: Wallet },
  { to: '/coupons', label: 'Codes promo', icon: Ticket },
  { to: '/referral', label: 'Parrainage & commissions', icon: Gift },
  { to: '/returns', label: 'Retours & remboursements', icon: RotateCcw },
  { to: '/disputes', label: 'Litiges & protection acheteur', icon: Gavel },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/wishlist', label: 'Mes favoris', icon: Heart },
  { to: '/track', label: 'Suivre une commande', icon: MapPin },
  { to: '/support', label: 'Aide & protection acheteur', icon: Headphones },
];

export default function Profile() {
  const [profile, setProfile] = useState(getProfile());
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const ids = getOrderIds();
    if (!ids.length) {
      setLoadingOrders(false);
      return;
    }
    Promise.all(ids.slice(0, 10).map((o) => base44.entities.Order.get(o.id).catch(() => null)))
      .then((rows) => setOrders(rows.filter(Boolean)))
      .finally(() => setLoadingOrders(false));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-lg font-bold md:text-xl">Mon profil</h1>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mes informations</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Nom complet"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Téléphone"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="Email (optionnel)"
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
            placeholder="Adresse de livraison par défaut"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <button type="submit" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Save className="h-4 w-4" /> {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Vos informations restent sur cet appareil et sont réutilisées au paiement.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mes commandes</h2>
        {loadingOrders ? (
          <div className="h-20 animate-pulse rounded-lg bg-secondary" />
        ) : orders.length ? (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/order/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">{o.order_number}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(o.created_date)} · {o.fulfillment_count || 1} expédition(s)
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
          <p className="text-xs text-muted-foreground">Aucune commande sur cet appareil pour le moment.</p>
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
            <p className="text-sm font-semibold">Espace vendeur</p>
            <p className="text-[11px] text-muted-foreground">Gérez votre boutique</p>
          </div>
        </Link>
        <Link to="/creator" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Espace créateur</p>
            <p className="text-[11px] text-muted-foreground">Affiliation & contenus</p>
          </div>
        </Link>
        <Link to="/courier" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <Truck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Espace livreur</p>
            <p className="text-[11px] text-muted-foreground">Courses & gains</p>
          </div>
        </Link>
        <Link to="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Administration</p>
            <p className="text-[11px] text-muted-foreground">Pilotage de la place de marché</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
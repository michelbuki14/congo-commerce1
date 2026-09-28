import React, { useEffect, useState } from 'react';
import { UserPlus, Plus, BadgeCheck, Power } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';
import { getCities } from '@/lib/config';
import TenantEmailField from '@/components/admin/TenantEmailField';
import { useTranslation } from 'react-i18next';

const TAB_IDS = ['sellers', 'creators', 'couriers', 'team'];

export default function AdminUsers() {
  const { t } = useTranslation();
  const TABS = TAB_IDS.map((id) => ({ id, label: t(`adminUsers.tab_${id}`) }));
  const [tab, setTab] = useState('sellers');
  const [sellers, setSellers] = useState([]);
  const [creators, setCreators] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({ email: '', role: 'user' });
  const [message, setMessage] = useState('');
  const [newSeller, setNewSeller] = useState({ name: '', email: '', city: getCities()[0], phone: '', commission_rate: 10 });
  const [showSellerForm, setShowSellerForm] = useState(false);

  const load = async () => {
    const [s, c, k, cl] = await Promise.all([
      base44.entities.Seller.list('name', 100).catch(() => []),
      base44.entities.Creator.list('name', 100).catch(() => []),
      base44.entities.Courier.list('name', 50).catch(() => []),
      base44.entities.AffiliateClick.list('-created_date', 500).catch(() => []),
    ]);
    setSellers(s);
    setCreators(c);
    setCouriers(k);
    setClicks(cl);
    setLoading(false);
  };

  // Creator earnings are read from the tracked affiliate conversions rather than
  // stored on the creator record, which no longer receives anonymous writes.
  const creatorStats = (creatorId) => {
    const mine = clicks.filter((x) => x.creator_id === creatorId && x.converted);
    return {
      conversions: mine.length,
      earnings: mine.reduce((sum, x) => sum + (Number(x.commission_usd) || 0), 0),
    };
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSeller = async (s) => {
    const next = s.status === 'active' ? 'suspended' : 'active';
    const updated = await base44.entities.Seller.update(s.id, { status: next });
    setSellers((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };

  const toggleCreator = async (c) => {
    const next = c.status === 'active' ? 'suspended' : 'active';
    const updated = await base44.entities.Creator.update(c.id, { status: next });
    setCreators((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  };

  const toggleCourier = async (k) => {
    const updated = await base44.entities.Courier.update(k.id, { active: !k.active });
    setCouriers((prev) => prev.map((x) => (x.id === k.id ? updated : x)));
  };

  const verifySeller = async (s) => {
    const updated = await base44.entities.Seller.update(s.id, { verified: !s.verified });
    setSellers((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };

  const createSeller = async (e) => {
    e.preventDefault();
    if (!newSeller.name) return;
    await base44.entities.Seller.create({
      ...newSeller,
      slug: newSeller.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      country: 'CD',
      status: 'pending',
      verified: false,
      delivery_info: 'Livraison locale 2-4 jours, retrait en point relais.',
    });
    setNewSeller({ name: '', email: '', city: getCities()[0], phone: '', commission_rate: 10 });
    setShowSellerForm(false);
    setMessage(t('adminUsers.shopCreated'));
    await load();
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!invite.email) return;
    try {
      await base44.users.inviteUser(invite.email, invite.role);
      setMessage(t('adminUsers.inviteSent', { email: invite.email, role: invite.role }));
      setInvite({ email: '', role: 'user' });
    } catch {
      setMessage(t('adminUsers.inviteFailed'));
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminUsers.title')} links={ADMIN_LINKS} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => setTab(tx.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === tx.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {tx.label}
          </button>
        ))}
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      {tab === 'sellers' && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSellerForm((s) => !s)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> {t('adminUsers.newShop')}
            </button>
          </div>
          {showSellerForm && (
            <form onSubmit={createSeller} className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
              <input value={newSeller.name} onChange={(e) => setNewSeller({ ...newSeller, name: e.target.value })} placeholder={t('adminUsers.shopName')} required className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              <select value={newSeller.city} onChange={(e) => setNewSeller({ ...newSeller, city: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                {getCities().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input value={newSeller.phone} onChange={(e) => setNewSeller({ ...newSeller, phone: e.target.value })} placeholder={t('adminUsers.phone')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              <input type="email" value={newSeller.email} onChange={(e) => setNewSeller({ ...newSeller, email: e.target.value })} placeholder={t('adminUsers.sellerEmail')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              <input type="number" value={newSeller.commission_rate} onChange={(e) => setNewSeller({ ...newSeller, commission_rate: Number(e.target.value) })} placeholder={t('adminUsers.commission')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground md:col-span-2">{t('adminUsers.createShop')}</button>
            </form>
          )}
          <div className="space-y-2">
            {sellers.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {s.name}
                    {s.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('adminUsers.sellerMeta', { city: s.city, phone: s.phone || t('adminUsers.noPhone'), rate: s.commission_rate ?? 10 })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TenantEmailField entity="Seller" record={s} onChange={(u) => setSellers((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
                  <StatusBadge status={s.status} />
                  <button type="button" onClick={() => verifySeller(s)} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                    {s.verified ? t('adminUsers.unverify') : t('adminUsers.verify')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSeller(s)}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                      s.status === 'active' ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {s.status === 'active' ? t('adminUsers.suspend') : t('adminUsers.activate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'creators' && (
        <div className="space-y-2">
          {creators.map((c) => {
            const stats = creatorStats(c.id);
            return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
              <div>
                <p className="text-sm font-semibold">{c.name} <span className="text-muted-foreground">@{c.handle}</span></p>
                <p className="text-[11px] text-muted-foreground">
                  {t('adminUsers.creatorMeta', { code: c.referral_code, rate: c.commission_rate, conversions: stats.conversions, earnings: formatUSD(stats.earnings) })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TenantEmailField entity="Creator" record={c} onChange={(u) => setCreators((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
                <StatusBadge status={c.status} />
                <button
                  type="button"
                  onClick={() => toggleCreator(c)}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    c.status === 'active' ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" /> {c.status === 'active' ? t('adminUsers.suspend') : t('adminUsers.activate')}
                </button>
              </div>
            </div>
            );
          })}
          {!creators.length && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">{t('adminUsers.noCreators')}</p>}
        </div>
      )}

      {tab === 'couriers' && (
        <div className="space-y-2">
          {couriers.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
              <div>
                <p className="text-sm font-semibold">
                  {k.name} {k.is_mock && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">{t('adminUsers.demo')}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('adminUsers.courierMeta', { code: k.code, base: formatUSD(k.base_rate_usd), perKg: formatUSD(k.per_kg_usd), days: k.avg_days, zones: (k.service_areas || []).join(', ') })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TenantEmailField entity="Courier" record={k} onChange={(u) => setCouriers((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
                <button
                  type="button"
                  onClick={() => toggleCourier(k)}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    k.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" /> {k.active ? t('adminUsers.active') : t('adminUsers.inactive')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && (
        <form onSubmit={sendInvite} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <UserPlus className="h-4 w-4 text-primary" /> {t('adminUsers.inviteTitle')}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="adresse@exemple.cd"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="user">{t('adminUsers.roleUser')}</option>
              <option value="admin">{t('adminUsers.roleAdmin')}</option>
            </select>
          </div>
          <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            {t('adminUsers.sendInvite')}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {t('adminUsers.inviteNote')}
          </p>
        </form>
      )}
    </div>
  );
}
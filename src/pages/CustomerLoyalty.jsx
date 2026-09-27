import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Info } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import LoyaltyTierCard from '@/components/loyalty/LoyaltyTierCard';
import RewardsCatalog from '@/components/loyalty/RewardsCatalog';
import { LOYALTY_TIERS, loadLoyaltyData, loyaltySummary, redeemReward } from '@/lib/loyalty';
import { getProfile, getSessionId } from '@/lib/session';
import { emitEvent } from '@/lib/events';
import { formatDate } from '@/lib/format';
import { base44 } from '@/api/base44Client';

export default function CustomerLoyalty() {
  const sessionId = getSessionId();
  const profile = getProfile();
  const [orders, setOrders] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadLoyaltyData({ sessionId, phone: profile.phone }).then((data) => {
      setOrders(data.orders);
      setRedemptions(data.redemptions);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = loyaltySummary({ orders, redemptions });

  const redeem = async (reward) => {
    setError('');
    setFlash('');
    if (summary.balance < reward.points) {
      setError('Solde de points insuffisant pour cette récompense.');
      return;
    }
    setRedeeming(reward.code);
    try {
      const record = await redeemReward({ reward, customer: profile, sessionId });
      setRedemptions((prev) => [record, ...prev]);
      setFlash(`Récompense obtenue — présentez le code ${record.coupon_code} au moment du paiement.`);
      emitEvent('loyalty_redeemed', {
        category: 'account',
        source: 'LoyaltyRedemption',
        reference: record.coupon_code,
        actorName: profile.name || '',
        actorEmail: profile.email || '',
        description: `Échange de ${reward.points} points contre « ${reward.label} »`,
        payload: { reward_code: reward.code, points_spent: reward.points, coupon_code: record.coupon_code },
      });
      await base44.entities.Notification.create({
        title: 'Récompense fidélité échangée',
        message: `${profile.name || 'Un client'} a échangé ${reward.points} points contre « ${reward.label} » (code ${record.coupon_code}).`,
        type: 'promo',
        audience: 'customer',
      }).catch(() => {});
    } catch {
      setError("L'échange n'a pas pu être enregistré. Réessayez.");
    } finally {
      setRedeeming('');
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <InfoPage
      icon={Gift}
      title="Fidélité & récompenses"
      subtitle="Vos points viennent de vos commandes livrées : 10 points par dollar dépensé. Échangez-les contre des bons, la livraison offerte ou des coffrets cadeaux."
    >
      <LoyaltyTierCard summary={summary} />

      {flash ? <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{flash}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{error}</p> : null}

      <RewardsCatalog balance={summary.balance} onRedeem={redeem} redeeming={redeeming} />

      <InfoSection title="Historique de mes points">
        {orders.length || redemptions.length ? (
          <div className="space-y-2">
            {[
              ...orders
                .filter((o) => o.status === 'DELIVERED' && o.payment_status !== 'REFUNDED')
                .map((o) => ({
                  key: `order-${o.id}`,
                  label: `Commande ${o.order_number}`,
                  detail: formatDate(o.created_date),
                  points: `+${Math.round((Number(o.total_usd) || 0) * 10)}`,
                  positive: true,
                })),
              ...redemptions.map((r) => ({
                key: `redeem-${r.id}`,
                label: `${r.reward_label} · ${r.coupon_code}`,
                detail: formatDate(r.created_date),
                points: `−${r.points_spent}`,
                positive: false,
              })),
            ]
              .sort((a, b) => 0)
              .map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">{row.detail}</p>
                  </div>
                  <span className={`font-bold ${row.positive ? 'text-emerald-700' : 'text-primary'}`}>{row.points}</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucun mouvement pour l'instant. Vos points apparaissent dès qu'une commande est livrée.
          </p>
        )}
        {summary.pending > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {summary.pending.toLocaleString('fr-FR')} points seront crédités à la livraison de vos commandes en cours.
          </p>
        ) : null}
      </InfoSection>

      <InfoSection title="Les niveaux de fidélité">
        <div className="space-y-2">
          {LOYALTY_TIERS.map((tier) => (
            <div key={tier.code} className={`rounded-xl border p-3 ${tier.code === summary.tier.code ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">{tier.name}</p>
                <span className="text-[11px] text-muted-foreground">dès {tier.min_points.toLocaleString('fr-FR')} points</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{tier.perks.join(' · ')}</p>
            </div>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="Bon à savoir">
        <p className="flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Les points suivent votre numéro de téléphone et cet appareil : renseignez le même numéro au paiement pour ne rien
          perdre. Les commandes annulées ou remboursées ne rapportent pas de points, et les points échangés sont déduits
          définitivement. Besoin d'aide sur un code ?{' '}
          <Link to="/support-tickets" className="font-semibold text-primary">Écrivez au support</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
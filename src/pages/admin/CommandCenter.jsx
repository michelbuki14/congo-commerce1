import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardNav from '@/components/DashboardNav';
import StatCard from '@/components/ops/StatCard';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD } from '@/lib/format';
import { loadCommandCenter } from '@/lib/commandCenter';

const Section = ({ title, to, children }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold">{title}</h2>
      {to && <Link to={to} className="text-[11px] font-semibold underline">Ouvrir</Link>}
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
  </section>
);
const bad = (n) => (n > 0 ? 'bad' : 'good');

export default function CommandCenter() {
  const [d, setD] = useState(null);
  const [at, setAt] = useState(null);
  const refresh = () => loadCommandCenter().then((x) => { setD(x); setAt(new Date()); });
  useEffect(() => { refresh(); const t = setInterval(refresh, 60000); return () => clearInterval(t); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 pb-24">
      <DashboardNav title="Centre de commande" links={ADMIN_LINKS} />
      <p className="text-[11px] text-muted-foreground">{at ? `Données réelles · actualisé à ${at.toLocaleTimeString('fr-FR')} · mise à jour chaque minute` : 'Chargement…'}</p>
      {!d ? <div className="h-80 animate-pulse rounded-2xl bg-secondary" /> : (
        <>
          <Section title="Commerce" to="/admin/orders">
            <StatCard label="Commandes aujourd'hui" value={d.commerce.ordersToday} />
            <StatCard label="GMV aujourd'hui" value={formatUSD(d.commerce.gmvToday)} />
            <StatCard label="Encaissé aujourd'hui" value={formatUSD(d.commerce.revenueToday)} />
            <StatCard label="Clients actifs (30 j)" value={d.commerce.activeCustomers} />
          </Section>
          <Section title="Finance & abonnements" to="/payout-ledger">
            <StatCard label="Paiements aujourd'hui" value={d.finance.paymentsToday} />
            <StatCard label="Paiements échoués" value={d.finance.failedPayments} tone={bad(d.finance.failedPayments)} />
            <StatCard label="Remboursements" value={d.finance.refunds} />
            <StatCard label="Revenu SaaS mensuel" value={formatUSD(d.finance.mrr)} />
          </Section>
          <Section title="Logistique" to="/delivery-map">
            <StatCard label="En transit" value={d.logistics.inTransit} />
            <StatCard label="Livrées aujourd'hui" value={d.logistics.deliveredToday} tone="good" />
            <StatCard label="Échecs de livraison" value={d.logistics.failedDeliveries} tone={bad(d.logistics.failedDeliveries)} />
            <StatCard label="Retours ouverts" value={d.logistics.openReturns} />
          </Section>
          <Section title="Réseau">
            <StatCard label="Vendeurs actifs" value={d.network.sellers} />
            <StatCard label="Créateurs" value={d.network.creators} />
            <StatCard label="Fournisseurs actifs" value={d.network.suppliers} />
            <StatCard label="Enseignes abonnées" value={d.network.subscriptions} />
          </Section>
          <Section title="Risque, support & infrastructure" to="/platform-health">
            <StatCard label="Alertes fraude" value={d.risk.fraud} tone={bad(d.risk.fraud)} />
            <StatCard label="Tickets en attente" value={d.risk.supportBacklog} tone={d.risk.supportBacklog ? 'warning' : 'good'} />
            <StatCard label="Synchros échouées (24 h)" value={d.risk.failedSyncs} tone={bad(d.risk.failedSyncs)} />
            <StatCard label="Workflows en échec" value={d.risk.failedJobs} tone={bad(d.risk.failedJobs)} />
          </Section>
        </>
      )}
    </div>
  );
}
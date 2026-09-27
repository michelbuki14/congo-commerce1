import React, { useCallback, useEffect, useState } from 'react';
import { Gavel } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import DisputeCaseCard from '@/components/disputes/DisputeCaseCard';
import { OPEN_STATUSES, threadFor } from '@/lib/disputeResolution';
import { formatUSD } from '@/lib/format';

const TABS = [
  { id: 'open', label: 'Ouverts' },
  { id: 'resolved', label: 'Traités' },
  { id: 'all', label: 'Tous' },
];

export default function DisputeResolution() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [actor, setActor] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');

  const isAdmin = String(actor?.role || '') === 'admin';

  useEffect(() => {
    base44.auth.me().then(setActor).catch(() => setActor(null));
  }, []);

  const load = useCallback(async () => {
    if (!actor) return;
    const [cases, threads] = await Promise.all([
      isAdmin
        ? base44.entities.Dispute.list('-created_date', 100).catch(() => [])
        : Promise.all([
            base44.entities.Dispute.filter({ tenant_owner_email: actor.email }, '-created_date', 100).catch(() => []),
            seller ? base44.entities.Dispute.filter({ seller_name: seller.name }, '-created_date', 100).catch(() => []) : [],
          ]).then(([mine, byName]) => [...mine, ...byName].reduce((acc, d) => (acc.some((x) => x.id === d.id) ? acc : [...acc, d]), [])),
      base44.entities.SupportTicket.list('-created_date', 100).catch(() => []),
    ]);
    setDisputes(cases);
    setTickets(threads);
    setLoading(false);
  }, [actor, isAdmin, seller]);

  useEffect(() => {
    load();
  }, [load]);

  const mergeTicket = (ticket) => {
    setTickets((prev) => (prev.some((t) => t.id === ticket.id) ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [ticket, ...prev]));
  };

  const open = disputes.filter((d) => OPEN_STATUSES.includes(String(d.status || '')));
  const atStake = open.reduce((sum, d) => sum + (Number(d.amount_usd) || 0), 0);
  const awaiting = open.filter((d) => !threadFor(tickets, d)).length;
  const visible = disputes.filter((d) => {
    const isOpen = OPEN_STATUSES.includes(String(d.status || ''));
    if (tab === 'open') return isOpen;
    if (tab === 'resolved') return !isOpen;
    return true;
  });

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Résolution des litiges"
        subtitle={isAdmin
          ? 'Examinez les dossiers ouverts, échangez avec le client et le vendeur, puis exécutez le remboursement ou le remplacement.'
          : 'Suivez les litiges sur vos commandes, transmettez vos pièces et proposez une résolution à la médiation.'}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Litiges ouverts" value={open.length} tone={open.length ? 'warn' : 'good'} />
        <StatCard label="Montant en jeu" value={formatUSD(atStake)} hint="dossiers ouverts" />
        <StatCard label="Sans réponse" value={awaiting} hint="aucun échange au dossier" tone={awaiting ? 'warn' : 'good'} />
        <StatCard label="Dossiers traités" value={disputes.length - open.length} hint="historique complet" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!isAdmin ? (
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          Vous pouvez échanger avec la médiation et proposer une résolution. L'exécution du remboursement relève de
          l'équipe Congo Commerce : votre proposition est jointe au dossier et arbitrée sous 48 h.
        </p>
      ) : null}

      {visible.length ? (
        <div className="space-y-2.5">
          {visible.map((d) => (
            <DisputeCaseCard
              key={d.id}
              dispute={d}
              ticket={threadFor(tickets, d)}
              isAdmin={isAdmin}
              actor={actor}
              onChanged={load}
              onMessage={mergeTicket}
            />
          ))}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          <Gavel className="h-4 w-4" /> Aucun litige dans ce filtre.
        </p>
      )}
    </div>
  );
}
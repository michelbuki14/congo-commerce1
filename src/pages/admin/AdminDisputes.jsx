import React, { useEffect, useState } from 'react';
import { Gavel, ShieldCheck, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import DisputeProofUpload from '@/components/disputes/DisputeProofUpload';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDateTime } from '@/lib/format';

const TYPE_LABELS = {
  not_received: 'Article non reçu',
  wrong_product: 'Mauvais article',
  damaged: 'Article endommagé',
  not_as_described: 'Non conforme',
  missing_item: 'Article manquant',
  payment_issue: 'Problème de paiement',
};

const TABS = [
  { id: 'open', label: 'Ouverts', statuses: ['open', 'investigating', 'escalated'] },
  { id: 'resolved', label: 'Résolus', statuses: ['resolved_buyer', 'resolved_seller', 'closed'] },
  { id: 'all', label: 'Tous', statuses: null },
];

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState('');
  const [reviewer, setReviewer] = useState('');

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (me?.email) setReviewer(me.email);
      const rows = await base44.entities.Dispute.list('-created_date', 100).catch(() => []);
      setDisputes(rows);
      setLoading(false);
    })();
  }, []);

  const resolve = async (dispute, status) => {
    setMessage('');
    const updated = await base44.entities.Dispute.update(dispute.id, {
      status,
      admin_notes: notes[dispute.id] ?? dispute.admin_notes ?? '',
    });
    setDisputes((prev) => prev.map((d) => (d.id === dispute.id ? updated : d)));
    await base44.entities.AuditLog.create({
      action: `dispute.${status}`,
      actor: 'admin',
      entity: 'Dispute',
      entity_id: dispute.id,
      reference: dispute.order_number,
      severity: status === 'resolved_seller' ? 'warning' : 'info',
      details: { amount_usd: dispute.amount_usd, reviewer },
    });
    setMessage(`Litige ${dispute.order_number} mis à jour : ${status}.`);
  };

  const attachProof = async (dispute, fileUri) => {
    const updated = await base44.entities.Dispute.update(dispute.id, {
      proof_of_delivery: fileUri,
      proof_uploaded_at: new Date().toISOString(),
      proof_uploaded_by: reviewer,
    });
    setDisputes((prev) => prev.map((d) => (d.id === dispute.id ? updated : d)));

    const shipments = await base44.entities.Shipment.filter({ order_number: dispute.order_number }).catch(() => []);
    if (shipments[0]) {
      await base44.entities.Shipment
        .update(shipments[0].id, {
          proof_of_delivery: fileUri,
          events: [
            ...(shipments[0].events || []),
            { status: shipments[0].status, label: 'Preuve de livraison ajoutée', at: new Date().toISOString() },
          ],
        })
        .catch(() => null);
    }
    setMessage(`Preuve de livraison jointe au litige ${dispute.order_number}.`);
  };

  const visible = disputes.filter((d) => {
    const statuses = TABS.find((t) => t.id === tab)?.statuses;
    return !statuses || statuses.includes(d.status);
  });

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Litiges ouverts" links={ADMIN_LINKS} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Ouverts', value: disputes.filter((d) => d.status === 'open').length },
          { label: 'En enquête', value: disputes.filter((d) => d.status === 'investigating').length },
          { label: 'Escaladés', value: disputes.filter((d) => d.status === 'escalated').length },
          { label: 'Avec preuve', value: disputes.filter((d) => d.proof_of_delivery).length },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3.5">
            <Gavel className="h-4 w-4 text-primary" />
            <p className="mt-1.5 text-lg font-bold">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Joindre la preuve de livraison (photo du colis remis, signature ou reçu) permet de trancher un litige « article non
          reçu » sans attendre la réponse du transporteur.
        </p>
      </div>

      <div className="flex gap-2">
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

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      <div className="space-y-2.5">
        {visible.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Gavel className="h-4 w-4 text-primary" /> {d.order_number}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {d.customer_name || 'Client'} vs {d.seller_name || 'Congo Commerce'} · {TYPE_LABELS[d.type] || d.type} ·{' '}
                  {formatDateTime(d.created_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={d.priority} />
                <StatusBadge status={d.status} />
                <span className="text-sm font-bold">{formatUSD(d.amount_usd)}</span>
              </div>
            </div>

            {d.description && <p className="mt-2 rounded-lg bg-secondary/50 p-2.5 text-xs">{d.description}</p>}
            {d.proof_of_delivery && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Preuve jointe le {formatDateTime(d.proof_uploaded_at)} par{' '}
                {d.proof_uploaded_by || 'administration'}
              </p>
            )}

            <input
              value={notes[d.id] ?? d.admin_notes ?? ''}
              onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
              placeholder="Décision et notes d'arbitrage"
              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => resolve(d, 'investigating')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                Enquêter
              </button>
              <button type="button" onClick={() => resolve(d, 'resolved_buyer')} className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                Faveur acheteur
              </button>
              <button type="button" onClick={() => resolve(d, 'resolved_seller')} className="rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
                Faveur vendeur
              </button>
              <button type="button" onClick={() => resolve(d, 'escalated')} className="rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold text-amber-900">
                Escalader
              </button>
              <button type="button" onClick={() => resolve(d, 'closed')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                Clôturer
              </button>
              <DisputeProofUpload dispute={d} onUploaded={attachProof} />
            </div>
          </div>
        ))}

        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucun litige dans ce filtre.
          </p>
        )}
      </div>
    </div>
  );
}
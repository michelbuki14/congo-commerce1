import React, { useEffect, useState } from 'react';
import { RotateCcw, Gavel, Check, X, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDateTime } from '@/lib/format';

const REASON_LABELS = {
  not_received: 'Article non reçu',
  wrong_product: 'Mauvais article',
  damaged: 'Article endommagé',
  not_as_described: 'Non conforme',
  missing_item: 'Article manquant',
  changed_mind: "Changement d'avis",
  payment_issue: 'Problème de paiement',
};

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('returns');

  const load = async () => {
    const [r, d] = await Promise.all([
      base44.entities.Return.list('-created_date', 100).catch(() => []),
      base44.entities.Dispute.list('-created_date', 100).catch(() => []),
    ]);
    setReturns(r);
    setDisputes(d);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateReturn = async (ret, status) => {
    setMessage('');
    const updated = await base44.entities.Return.update(ret.id, { status, resolution_notes: notes[ret.id] || ret.resolution_notes || '' });
    setReturns((prev) => prev.map((x) => (x.id === ret.id ? updated : x)));

    if (status === 'refunded') {
      const wallets = await base44.entities.Wallet.filter({ owner_type: 'customer', owner_name: ret.customer_name }).catch(() => []);
      let wallet = wallets[0];
      if (!wallet) {
        wallet = await base44.entities.Wallet.create({
          owner_type: 'customer',
          owner_name: ret.customer_name,
          owner_email: '',
          balance_usd: 0,
        });
      }
      const amount = Number(ret.refund_amount_usd) || 0;
      const updatedWallet = await base44.entities.Wallet.update(wallet.id, {
        balance_usd: Math.round(((wallet.balance_usd || 0) + amount) * 100) / 100,
        lifetime_credit_usd: Math.round(((wallet.lifetime_credit_usd || 0) + amount) * 100) / 100,
      });
      await base44.entities.WalletTransaction.create({
        wallet_id: wallet.id,
        owner_type: 'customer',
        owner_name: ret.customer_name,
        type: 'REFUND',
        direction: 'credit',
        amount_usd: amount,
        balance_after_usd: updatedWallet.balance_usd,
        currency: 'USD',
        description: `Remboursement retour ${ret.return_number}`,
        reference: ret.return_number,
        order_number: ret.order_number,
      });
      if (ret.order_id) {
        await base44.entities.Order.update(ret.order_id, { payment_status: 'REFUNDED' }).catch(() => {});
      }
      await base44.entities.Notification.create({
        title: `Remboursement de ${formatUSD(amount)}`,
        message: `Votre retour ${ret.return_number} a été accepté. Le montant est crédité sur votre portefeuille.`,
        type: 'payment',
        audience: 'customer',
        order_number: ret.order_number,
        is_demo: true,
      });
      setMessage(`Retour ${ret.return_number} remboursé (${formatUSD(amount)} crédités).`);
    } else {
      setMessage(`Retour ${ret.return_number} mis à jour : ${status}.`);
    }
    await base44.entities.AuditLog.create({
      action: `return.${status}`,
      actor: 'admin',
      entity: 'Return',
      entity_id: ret.id,
      reference: ret.return_number,
      severity: status === 'rejected' ? 'warning' : 'info',
      details: { amount_usd: ret.refund_amount_usd },
    });
  };

  const updateDispute = async (d, status) => {
    const updated = await base44.entities.Dispute.update(d.id, { status, admin_notes: notes[d.id] || d.admin_notes || '' });
    setDisputes((prev) => prev.map((x) => (x.id === d.id ? updated : x)));
    setMessage(`Litige ${d.order_number} mis à jour : ${status}.`);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Retours & litiges" links={ADMIN_LINKS} />

      <div className="flex gap-2">
        {[
          { id: 'returns', label: `Retours (${returns.length})` },
          { id: 'disputes', label: `Litiges (${disputes.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      {tab === 'returns' && (
        <div className="space-y-2.5">
          {returns.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <RotateCcw className="h-4 w-4 text-primary" /> {r.return_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.order_number} · {r.customer_name} · {r.customer_phone} · {formatDateTime(r.created_date)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Motif : {REASON_LABELS[r.reason] || r.reason} · {r.product_title || 'article non précisé'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-sm font-bold">{formatUSD(r.refund_amount_usd)}</span>
                </div>
              </div>
              {r.description && <p className="mt-2 rounded-lg bg-secondary/50 p-2.5 text-xs">{r.description}</p>}
              <input
                value={notes[r.id] ?? r.resolution_notes ?? ''}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                placeholder="Note interne / réponse au client"
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateReturn(r, 'under_review')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  Mettre en examen
                </button>
                <button type="button" onClick={() => updateReturn(r, 'approved')} className="flex items-center gap-1 rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
                  <Check className="h-3.5 w-3.5" /> Approuver
                </button>
                <button type="button" onClick={() => updateReturn(r, 'refunded')} className="flex items-center gap-1 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                  <Banknote className="h-3.5 w-3.5" /> Rembourser
                </button>
                <button type="button" onClick={() => updateReturn(r, 'rejected')} className="flex items-center gap-1 rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-900">
                  <X className="h-3.5 w-3.5" /> Refuser
                </button>
              </div>
            </div>
          ))}
          {!returns.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Aucune demande de retour.
            </p>
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-2.5">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <Gavel className="h-4 w-4 text-primary" /> {d.order_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.customer_name} vs {d.seller_name || 'Congo Commerce'} · {REASON_LABELS[d.type] || d.type} · {formatDateTime(d.created_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.priority} />
                  <StatusBadge status={d.status} />
                  <span className="text-sm font-bold">{formatUSD(d.amount_usd)}</span>
                </div>
              </div>
              {d.description && <p className="mt-2 rounded-lg bg-secondary/50 p-2.5 text-xs">{d.description}</p>}
              <input
                value={notes[d.id] ?? d.admin_notes ?? ''}
                onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                placeholder="Décision et notes d'arbitrage"
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateDispute(d, 'investigating')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  Enquêter
                </button>
                <button type="button" onClick={() => updateDispute(d, 'resolved_buyer')} className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                  Faveur acheteur
                </button>
                <button type="button" onClick={() => updateDispute(d, 'resolved_seller')} className="rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
                  Faveur vendeur
                </button>
                <button type="button" onClick={() => updateDispute(d, 'closed')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  Clôturer
                </button>
              </div>
            </div>
          ))}
          {!disputes.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Aucun litige ouvert. Les cas signalés apparaissent ici pour arbitrage.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
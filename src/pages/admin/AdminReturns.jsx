import React, { useEffect, useState } from 'react';
import { RotateCcw, Gavel, Check, X, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import StatusBadge from '@/components/StatusBadge';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatUSD, formatDateTime } from '@/lib/format';
import { useTranslation } from 'react-i18next';

const REASON_IDS = ['not_received', 'wrong_product', 'damaged', 'not_as_described', 'missing_item', 'changed_mind', 'payment_issue'];

export default function AdminReturns() {
  const { t } = useTranslation();
  const REASON_LABELS = Object.fromEntries(REASON_IDS.map((id) => [id, t(`adminReturns.reason_${id}`)]));
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
      const amount = Number(ret.refund_amount_usd) || 0;
      const res = await base44.functions.invoke('refund-payment', {
        order_number: ret.order_number,
        amount,
        reason: `Retour ${ret.return_number}`,
        return_number: ret.return_number,
      });
      if (!res?.data?.order) {
        setMessage(res?.data?.error || t('adminReturns.refundFailed'));
        return;
      }
      if (res.data.provider_refund === 'manual_required') {
        setMessage(t('adminReturns.manualRefund', { num: ret.return_number }));
      } else {
        setMessage(t('adminReturns.refunded', { num: ret.return_number, amount: formatUSD(amount) }));
      }
    } else {
      setMessage(t('adminReturns.updated', { num: ret.return_number, status }));
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
    setMessage(t('adminReturns.disputeUpdated', { order: d.order_number, status }));
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminReturns.title')} links={ADMIN_LINKS} />

      <div className="flex gap-2">
        {[
          { id: 'returns', label: t('adminReturns.tabReturns', { count: returns.length }) },
          { id: 'disputes', label: t('adminReturns.tabDisputes', { count: disputes.length }) },
        ].map((tx) => (
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
                    {t('adminReturns.reasonLine', { reason: REASON_LABELS[r.reason] || r.reason, product: r.product_title || t('adminReturns.unspecified') })}
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
                placeholder={t('adminReturns.notePlaceholder')}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateReturn(r, 'under_review')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  {t('adminReturns.review')}
                </button>
                <button type="button" onClick={() => updateReturn(r, 'approved')} className="flex items-center gap-1 rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
                  <Check className="h-3.5 w-3.5" /> {t('adminReturns.approve')}
                </button>
                <button type="button" onClick={() => updateReturn(r, 'refunded')} className="flex items-center gap-1 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                  <Banknote className="h-3.5 w-3.5" /> {t('adminReturns.refund')}
                </button>
                <button type="button" onClick={() => updateReturn(r, 'rejected')} className="flex items-center gap-1 rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-900">
                  <X className="h-3.5 w-3.5" /> {t('adminReturns.reject')}
                </button>
              </div>
            </div>
          ))}
          {!returns.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              {t('adminReturns.emptyReturns')}
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
                placeholder={t('adminReturns.decisionPlaceholder')}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-xs"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateDispute(d, 'investigating')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  {t('adminReturns.investigate')}
                </button>
                <button type="button" onClick={() => updateDispute(d, 'resolved_buyer')} className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">
                  {t('adminReturns.favorBuyer')}
                </button>
                <button type="button" onClick={() => updateDispute(d, 'resolved_seller')} className="rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-semibold text-sky-900">
                  {t('adminReturns.favorSeller')}
                </button>
                <button type="button" onClick={() => updateDispute(d, 'closed')} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
                  {t('adminReturns.close')}
                </button>
              </div>
            </div>
          ))}
          {!disputes.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              {t('adminReturns.emptyDisputes')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
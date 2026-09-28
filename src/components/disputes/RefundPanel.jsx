import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile, uid } from '@/lib/session';
import { formatUSD, formatDate } from '@/lib/format';

export default function RefundPanel() {
  const { t } = useTranslation();
  const REASONS = [
    { id: 'not_received', label: t('refundPanel.reasonNotReceived') },
    { id: 'wrong_product', label: t('refundPanel.reasonWrongProduct') },
    { id: 'damaged', label: t('refundPanel.reasonDamaged') },
    { id: 'not_as_described', label: t('refundPanel.reasonNotAsDescribed') },
    { id: 'missing_item', label: t('refundPanel.reasonMissingItem') },
    { id: 'changed_mind', label: t('refundPanel.reasonChangedMind') },
  ];

  const STAGES = [
    { id: 'requested', label: t('refundPanel.stageRequested') },
    { id: 'under_review', label: t('refundPanel.stageUnderReview') },
    { id: 'approved', label: t('refundPanel.stageApproved') },
    { id: 'refunded', label: t('refundPanel.stageRefunded') },
  ];
  const profile = getProfile();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ order_number: '', product_title: '', reason: 'not_received', description: '', phone: profile.phone || '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (phone) => {
    const rows = await base44.entities.Return.filter({ customer_phone: phone || '—' }, '-created_date', 30).catch(() => []);
    setReturns(rows);
    setLoading(false);
  };

  useEffect(() => {
    load(profile.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.order_number.trim()) {
      setError(t('refundPanel.orderNumberRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const number = form.order_number.trim().toUpperCase();
      const orderRows = await base44.entities.Order.filter({ order_number: number }).catch(() => []);
      const order = orderRows[0];
      await base44.entities.Return.create({
        return_number: `RET-${uid('').slice(1, 7).toUpperCase()}`,
        order_id: order?.id || '',
        order_number: number,
        customer_name: profile.name || 'Client',
        customer_phone: form.phone || profile.phone || '',
        product_title: form.product_title || order?.items?.[0]?.title || '',
        reason: form.reason,
        description: form.description,
        refund_amount_usd: order?.total_usd || 0,
        status: 'requested',
      });
      await base44.entities.Notification.create({
        title: 'Nouvelle demande de remboursement',
        message: `${profile.name || 'Un client'} demande un remboursement sur ${number}.`,
        type: 'order',
        audience: 'admin',
        order_number: number,
        is_demo: true,
      });
      setSuccess(t('refundPanel.refundSent'));
      setForm({ ...form, order_number: '', product_title: '', description: '' });
      await load(form.phone || profile.phone);
    } catch {
      setError(t('refundPanel.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <RotateCcw className="h-4 w-4 text-primary" /> {t('refundPanel.askRefund')}
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder={t('refundPanel.orderNumberPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('refundPanel.phonePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <input
            value={form.product_title}
            onChange={(e) => setForm({ ...form, product_title: e.target.value })}
            placeholder={t('refundPanel.itemPh')}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder={t('refundPanel.descPh')}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
          {success && <p className="text-xs text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? t('refundPanel.sending') : t('refundPanel.submit')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('refundPanel.myRefunds')}</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : returns.length ? (
          <div className="space-y-2.5">
            {returns.map((r) => {
              const index = STAGES.findIndex((s) => s.id === r.status);
              return (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{r.return_number}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-sm font-semibold">{formatUSD(r.refund_amount_usd)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.order_number} · {REASONS.find((x) => x.id === r.reason)?.label} · {formatDate(r.created_date)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {STAGES.map((s, i) => (
                      <span
                        key={s.id}
                        className={`text-[11px] ${index >= i && index > -1 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                      >
                        {index >= i && index > -1 ? '●' : '○'} {s.label}
                      </span>
                    ))}
                  </div>
                  {r.resolution_notes && <p className="mt-1.5 text-xs font-medium text-primary">{t('refundPanel.responseIs', { notes: r.resolution_notes })}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('refundPanel.noRequests')}</p>
        )}
      </section>
    </>
  );
}

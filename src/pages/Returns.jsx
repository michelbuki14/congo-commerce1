import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile, uid } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { emitEvent } from '@/lib/events';

export default function Returns() {
  const { t } = useTranslation();
  const REASONS = [
    { id: 'not_received', label: t('returns.reasonNotReceived') },
    { id: 'wrong_product', label: t('returns.reasonWrongProduct') },
    { id: 'damaged', label: t('returns.reasonDamaged') },
    { id: 'not_as_described', label: t('returns.reasonNotAsDescribed') },
    { id: 'missing_item', label: t('returns.reasonMissingItem') },
    { id: 'changed_mind', label: t('returns.reasonChangedMind') },
  ];
  const profile = getProfile();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ order_number: '', product_title: '', reason: 'not_received', description: '', phone: profile.phone || '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const rows = await base44.entities.Return.filter({ customer_phone: form.phone || profile.phone || '—' }, '-created_date', 30).catch(() => []);
    setReturns(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.order_number.trim()) {
      setError(t('returns.orderNumberRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const orderRows = await base44.entities.Order.filter({ order_number: form.order_number.trim().toUpperCase() }).catch(() => []);
      const order = orderRows[0];
      await base44.entities.Return.create({
        return_number: `RET-${uid('').slice(1, 7).toUpperCase()}`,
        order_id: order?.id || '',
        order_number: form.order_number.trim().toUpperCase(),
        customer_name: profile.name || 'Client',
        customer_phone: form.phone || profile.phone || '',
        product_title: form.product_title || (order?.items?.[0]?.title ?? ''),
        reason: form.reason,
        description: form.description,
        refund_amount_usd: order?.total_usd || 0,
        status: 'requested',
      });
      await base44.entities.Notification.create({
        title: 'Nouvelle demande de retour',
        message: `${profile.name || 'Un client'} demande un retour sur ${form.order_number.trim().toUpperCase()}.`,
        type: 'order',
        audience: 'admin',
        order_number: form.order_number.trim().toUpperCase(),
        is_demo: true,
      });
      emitEvent('return_requested', {
        category: 'order',
        source: 'Return',
        reference: form.order_number.trim().toUpperCase(),
        actorName: profile.name || '',
        actorEmail: profile.email || '',
        description: `Retour demandé sur ${form.order_number.trim().toUpperCase()} — ${
          REASONS.find((r) => r.id === form.reason)?.label || 'motif non précisé'
        }`,
        payload: { reason: form.reason, product_title: form.product_title || order?.items?.[0]?.title || '' },
      });
      setSuccess(t('returns.requestSent'));
      setForm({ ...form, order_number: '', product_title: '', description: '' });
      await load();
    } catch {
      setError(t('returns.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('returns.title')}</h1>

      <Link
        to="/returns-portal"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-sm font-semibold"
      >
        {t('returns.portalTitle')}
        <span className="text-xs text-primary">{t('returns.portalOpen')}</span>
      </Link>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('returns.buyerProtection')}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <RotateCcw className="h-4 w-4 text-primary" /> {t('returns.newRequest')}
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder={t('returns.orderNumberPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('returns.phonePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <input
            value={form.product_title}
            onChange={(e) => setForm({ ...form, product_title: e.target.value })}
            placeholder={t('returns.itemPh')}
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
            placeholder={t('returns.descPh')}
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
            {submitting ? t('returns.sending') : t('returns.submit')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('returns.myRequests')}</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : returns.length ? (
          <div className="space-y-2">
            {returns.map((r) => (
              <div key={r.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.return_number}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.order_number} · {REASONS.find((x) => x.id === r.reason)?.label} · {formatDate(r.created_date)}
                </p>
                {r.resolution_notes && <p className="mt-1 text-xs text-muted-foreground">{t('returns.responseIs', { notes: r.resolution_notes })}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('returns.noRequests')}</p>
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RotateCcw, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile, uid } from '@/lib/session';
import { fetchMyOrders } from '@/lib/customerAccount';
import { formatUSD, formatDate } from '@/lib/format';
import { RETURN_COPY } from '@/lib/returnCopy';

const WINDOW_DAYS = 7;

export default function ReturnsPortal() {
  const { t, i18n } = useTranslation();
  const copy = RETURN_COPY[i18n.language === 'en' ? 'en' : 'fr'];
  const REASONS = [
    { id: 'not_received', label: t('returnsPortal.reasonNotReceived') },
    { id: 'wrong_product', label: t('returnsPortal.reasonWrongProduct') },
    { id: 'damaged', label: t('returnsPortal.reasonDamaged') },
    { id: 'not_as_described', label: t('returnsPortal.reasonNotAsDescribed') },
    { id: 'missing_item', label: t('returnsPortal.reasonMissingItem') },
    { id: 'changed_mind', label: t('returnsPortal.reasonChangedMind') },
  ];

  function eligible(order) {
    if (order.status !== 'DELIVERED') return { ok: false, reason: t('returnsPortal.eligibleAfterDelivery') };
    const days = (Date.now() - new Date(order.updated_date || order.created_date).getTime()) / 86400000;
    if (days > WINDOW_DAYS) return { ok: false, reason: t('returnsPortal.windowPassed', { days: WINDOW_DAYS }) };
    return { ok: true, reason: '' };
  }

  const profile = getProfile();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('not_received');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setOrders(await fetchMyOrders({ limit: 20 }));
      const mine = await base44.entities.Return
        .filter({ customer_phone: profile.phone || '—' }, '-created_date', 30)
        .catch(() => []);
      setReturns(mine);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const submit = async () => {
    setError('');
    setMessage('');
    if (!selected.length) {
      setError(t('returnsPortal.selectItems'));
      return;
    }
    setSubmitting(true);
    try {
      for (const key of selected) {
        const [orderId, index] = key.split('::');
        const order = orders.find((o) => o.id === orderId);
        const item = order?.items?.[Number(index)];
        if (!item) continue;
        await base44.entities.Return.create({
          return_number: `RET-${uid('').slice(1, 7).toUpperCase()}`,
          order_id: order.id,
          order_number: order.order_number,
          customer_name: profile.name || 'Client',
          customer_phone: profile.phone || '',
          product_id: item.product_id || '',
          product_title: item.title || '',
          reason,
          description,
          refund_amount_usd: item.line_total_usd || 0,
          status: 'requested',
          tenant_id: order.tenant_id || '',
          tenant_owner_email: order.tenant_owner_email || '',
        });
      }
      await base44.entities.Notification.create({
        title: 'Nouvelle demande de retour',
        message: `${profile.name || 'Un client'} demande le retour de ${selected.length} article(s).`,
        type: 'order',
        audience: 'admin',
        is_demo: true,
      });
      setMessage(t('returnsPortal.requestCovers', { count: selected.length }));
      setReturns(await base44.entities.Return.filter({ customer_phone: profile.phone || '—' }, '-created_date', 30));
      setSelected([]);
      setDescription('');
    } catch {
      setError(t('returnsPortal.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('returnsPortal.title')}</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('returnsPortal.protection', { days: WINDOW_DAYS })}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('returnsPortal.step1')}</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : orders.length ? (
          <div className="space-y-3">
            {orders.map((order) => {
              const state = eligible(order);
              return (
                <div key={order.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{order.order_number}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(order.created_date)} · {formatUSD(order.total_usd)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  {!state.ok && <p className="mt-1 text-[11px] text-amber-600">{state.reason}</p>}
                  <div className="mt-2 space-y-1.5">
                    {(order.items || []).map((item, index) => {
                      const key = `${order.id}::${index}`;
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-3 rounded-lg border border-border p-2 ${
                            state.ok ? 'cursor-pointer' : 'opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(key)}
                            disabled={!state.ok}
                            onChange={() => toggle(key)}
                            className="h-4 w-4"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.title}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ×{item.quantity} · {formatUSD(item.line_total_usd)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {!state.ok && (
                    <Link to="/support" className="mt-1 inline-block text-[11px] font-semibold text-primary">
                      {t('returnsPortal.notReceivedTicket')}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            {t('returnsPortal.noOrders')}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('returnsPortal.step2')}</h2>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t('returnsPortal.descPh')}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        {message && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {message}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !selected.length}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? t('returnsPortal.sending') : t('returnsPortal.requestReturn', { count: selected.length })}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <RotateCcw className="h-4 w-4 text-primary" /> {t('returnsPortal.myRequests')}
        </h2>
        {returns.length ? (
          <div className="space-y-2">
            {returns.map((r) => (
              <div key={r.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.return_number}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.order_number} · {r.product_title} · {formatDate(r.created_date)} · {formatUSD(r.refund_amount_usd)}
                </p>
                {r.resolution_notes && <p className="mt-1 text-xs text-muted-foreground">{r.resolution_notes}</p>}
                {!['refunded', 'closed'].includes(r.status) && <Link to={`/disputes?order=${encodeURIComponent(r.order_number)}&phone=${encodeURIComponent(r.customer_phone)}&reason=${encodeURIComponent(r.reason)}`} className="mt-2 inline-block text-xs font-semibold text-primary">{copy.escalate}</Link>}
                </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('returnsPortal.noRequests')}</p>
        )}
      </section>
    </div>
  );
}
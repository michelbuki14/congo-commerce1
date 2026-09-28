import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ReturnOrderCard from '@/components/returns/ReturnOrderCard';
import { getProfile } from '@/lib/session';
import { emitEvent } from '@/lib/events';
import { formatUSD, formatDate } from '@/lib/format';
import {
  RETURN_REASON_LABELS,
  RETURN_WINDOW_DAYS,
  findOrderByNumber,
  loadMyOrders,
  loadMyReturns,
  returnEligibility,
  submitReturns,
} from '@/lib/returns';

export default function OrderReturns() {
  const { t } = useTranslation();
  const profile = getProfile();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [selection, setSelection] = useState({});
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(profile.phone || '');
  const [lookup, setLookup] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const [mine, requests] = await Promise.all([loadMyOrders(), loadMyReturns(profile.phone)]);
      setOrders(mine);
      setReturns(requests);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (key) => {
    setSelection((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { reason: 'not_received' } };
    });
  };

  const setReason = (key, reason) => {
    setSelection((prev) => ({ ...prev, [key]: { ...prev[key], reason } }));
  };

  const addByNumber = async () => {
    setError('');
    setMessage('');
    const found = await findOrderByNumber(lookup);
    if (!found) {
      setError(t('orderReturns.noMatch'));
      return;
    }
    setOrders((prev) => (prev.some((o) => o.id === found.id) ? prev : [found, ...prev]));
    setLookup('');
    setMessage(t('orderReturns.orderAdded', { number: found.order_number }));
  };

  const submit = async () => {
    const picked = Object.keys(selection);
    setError('');
    setMessage('');
    if (!picked.length) {
      setError(t('orderReturns.selectItems'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await submitReturns({
        orders,
        selection,
        description,
        customer: { name: profile.name, phone },
      });
      await base44.entities.Notification.create({
        title: 'Nouvelle demande de retour',
        message: `${profile.name || 'Un client'} demande le retour de ${created.length} article(s).`,
        type: 'order',
        audience: 'admin',
      });
      emitEvent('return_requested', {
        category: 'order',
        source: 'Return',
        reference: created.map((r) => r.order_number).join(', '),
        actorName: profile.name || '',
        actorEmail: profile.email || '',
        description: `Retour demandé sur ${created.length} article(s)`,
        payload: { reasons: created.map((r) => r.reason) },
      });
      setMessage(t('orderReturns.requestSent', { count: created.length }));
      setSelection({});
      setDescription('');
      setReturns(await loadMyReturns(phone));
    } catch {
      setError(t('orderReturns.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickedCount = Object.keys(selection).length;
  const pickedTotal = Object.entries(selection).reduce((sum, [key]) => {
    const [orderId, index] = key.split('::');
    const item = orders.find((o) => o.id === orderId)?.items?.[Number(index)];
    return sum + (Number(item?.line_total_usd) || 0);
  }, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('orderReturns.title')}</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('orderReturns.protection', { days: RETURN_WINDOW_DAYS })}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Search className="h-4 w-4 text-primary" /> {t('orderReturns.findOrder')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={lookup}
            onChange={(e) => setLookup(e.target.value.toUpperCase())}
            placeholder={t('orderReturns.orderNumberPh')}
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={addByNumber}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            {t('orderReturns.add')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('orderReturns.lookupHint')}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('orderReturns.step1')}</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : orders.length ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <ReturnOrderCard
                key={order.id}
                order={order}
                eligibility={returnEligibility(order)}
                selection={selection}
                onToggle={toggle}
                onReason={setReason}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={RotateCcw}
            title={t('orderReturns.emptyTitle')}
            description={t('orderReturns.emptyText')}
            actionTo="/order-history"
            actionLabel={t('orderReturns.emptyCta')}
          />
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('orderReturns.step2')}</h2>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('orderReturns.phonePh')}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t('orderReturns.descPh')}
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        {pickedCount ? (
          <div className="rounded-xl bg-secondary/60 p-3 text-xs">
            <p className="font-semibold">{t('orderReturns.pickedSummary', { count: pickedCount, total: formatUSD(pickedTotal) })}</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {Object.entries(selection).map(([key, value]) => {
                const [orderId, index] = key.split('::');
                const order = orders.find((o) => o.id === orderId);
                const item = order?.items?.[Number(index)];
                return (
                  <li key={key}>
                    {order?.order_number} — {item?.title} : {RETURN_REASON_LABELS[value.reason]}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        ) : null}
        {message ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !pickedCount}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? t('orderReturns.sending') : t('orderReturns.requestReturn', { count: pickedCount })}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <RotateCcw className="h-4 w-4 text-primary" /> {t('orderReturns.myRequests')}
        </h2>
        {returns.length ? (
          <div className="space-y-2">
            {returns.map((r) => (
              <div key={r.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.return_number}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-sm font-semibold">{formatUSD(r.refund_amount_usd)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {r.order_number} · {r.product_title} · {RETURN_REASON_LABELS[r.reason] || r.reason} · {formatDate(r.created_date)}
                </p>
                {r.resolution_notes ? <p className="mt-1 text-xs text-primary">{t('orderReturns.responseIs', { notes: r.resolution_notes })}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('orderReturns.noRequests')}</p>
        )}
      </section>
    </div>
  );
}

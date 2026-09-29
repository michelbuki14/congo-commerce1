import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gavel, ShieldCheck, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile } from '@/lib/session';
import { fetchMyDisputes, openDispute } from '@/lib/customerAccount';
import { formatUSD, formatDate } from '@/lib/format';
import { emitEvent } from '@/lib/events';
import { lookupOrder } from '@/lib/orderLookup';
import { RETURN_COPY } from '@/lib/returnCopy';

export default function Disputes() {
  const { t, i18n } = useTranslation();
  const copy = RETURN_COPY[i18n.language === 'en' ? 'en' : 'fr'];
  const TYPES = [
    { id: 'not_received', label: t('disputes.typeNotReceived') },
    { id: 'wrong_product', label: t('disputes.typeWrongProduct') },
    { id: 'damaged', label: t('disputes.typeDamaged') },
    { id: 'not_as_described', label: t('disputes.typeNotAsDescribed') },
    { id: 'missing_item', label: t('disputes.typeMissingItem') },
    { id: 'payment_issue', label: t('disputes.typePaymentIssue') },
  ];
  const profile = getProfile();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    return {
      order_number: params.get('order') || '',
      type: ['not_received', 'wrong_product', 'damaged', 'not_as_described', 'missing_item'].includes(reason) ? reason : 'not_received',
      description: '',
      phone: params.get('phone') || profile.phone || '',
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (phone) => {
    const rows = await fetchMyDisputes({ phone: phone || '' });
    setDisputes(rows);
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
      setError(t('disputes.orderNumberRequired'));
      return;
    }
    if (!form.phone.trim()) {
      setError(copy.phoneRequired);
      return;
    }
    setSubmitting(true);
    try {
      const number = form.order_number.trim().toUpperCase();
      const { order } = await lookupOrder(number, form.phone);
      await openDispute({
        orderNumber: number,
        phone: form.phone || profile.phone || '',
        type: form.type,
        description: form.description,
      });
      emitEvent('dispute_opened', {
        category: 'risk',
        source: 'Dispute',
        reference: number,
        actorName: profile.name || '',
        actorEmail: profile.email || '',
        description: `${TYPES.find((tx) => tx.id === form.type)?.label || 'Litige'} sur ${number} — ${profile.name || 'client'}${
          form.description ? ` : ${form.description}` : ''
        }`,
        payload: { type: form.type, amount_usd: order?.total_usd || 0, phone: form.phone || profile.phone || '' },
      });
      setSuccess(t('disputes.disputeOpened'));
      setForm({ ...form, order_number: '', description: '' });
      await load(form.phone || profile.phone);
    } catch (err) {
      setError(err.message || t('disputes.openFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('disputes.title')}</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('disputes.buyerProtection')}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gavel className="h-4 w-4 text-primary" /> {t('disputes.openDispute')}
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder={t('disputes.orderNumberPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('disputes.phonePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {TYPES.map((tx) => (
              <option key={tx.id} value={tx.id}>{tx.label}</option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder={t('disputes.descPh')}
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
            {submitting ? t('disputes.sending') : t('disputes.openDispute')}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {t('disputes.alsoReturnPre')} <Link to="/returns" className="font-semibold text-primary">{t('disputes.alsoReturnLink')}</Link>.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('disputes.myDisputes')}</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : disputes.length ? (
          <div className="space-y-2">
            {disputes.map((d) => (
              <div key={d.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{d.order_number}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <span className="text-sm font-semibold">{formatUSD(d.amount_usd)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {TYPES.find((x) => x.id === d.type)?.label} · {d.seller_name || 'Congo Commerce'} · {formatDate(d.created_date)}
                </p>
                {d.description && <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>}
                {d.admin_notes && <p className="mt-1 text-xs font-medium text-primary">{t('disputes.decisionIs', { notes: d.admin_notes })}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('disputes.noDisputes')}</p>
        )}
      </section>
    </div>
  );
}
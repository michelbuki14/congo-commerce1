import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gavel, AlertCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { openDispute, fetchMyDisputes } from '@/lib/customerAccount';
import { getProfile } from '@/lib/session';
import { formatUSD, formatDate } from '@/lib/format';

export default function DisputePanel() {
  const { t } = useTranslation();
  const TYPES = [
    { id: 'not_received', label: t('disputePanel.typeNotReceived') },
    { id: 'wrong_product', label: t('disputePanel.typeWrongProduct') },
    { id: 'damaged', label: t('disputePanel.typeDamaged') },
    { id: 'not_as_described', label: t('disputePanel.typeNotAsDescribed') },
    { id: 'missing_item', label: t('disputePanel.typeMissingItem') },
    { id: 'payment_issue', label: t('disputePanel.typePaymentIssue') },
  ];

  const STAGES = [
    { id: 'open', label: t('disputePanel.stageOpen') },
    { id: 'investigating', label: t('disputePanel.stageInvestigating') },
    { id: 'resolved_buyer', label: t('disputePanel.stageResolved') },
    { id: 'closed', label: t('disputePanel.stageClosed') },
  ];
  const profile = getProfile();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ order_number: '', type: 'not_received', description: '', phone: profile.phone || '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (phone) => {
    setDisputes(await fetchMyDisputes({ phone }));
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
      setError(t('disputePanel.orderNumberRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const number = form.order_number.trim().toUpperCase();
      await openDispute({
        orderNumber: number,
        phone: form.phone || profile.phone || '',
        type: form.type,
        description: form.description,
      });
      setSuccess(t('disputePanel.disputeOpened'));
      setForm({ ...form, order_number: '', description: '' });
      await load(form.phone || profile.phone);
    } catch {
      setError(t('disputePanel.openFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gavel className="h-4 w-4 text-primary" /> {t('disputePanel.openDispute')}
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder={t('disputePanel.orderNumberPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('disputePanel.phonePh')}
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
            placeholder={t('disputePanel.descPh')}
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
            {submitting ? t('disputePanel.sending') : t('disputePanel.openDispute')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('disputePanel.myDisputes')}</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : disputes.length ? (
          <div className="space-y-2.5">
            {disputes.map((d) => {
              const index = STAGES.findIndex((s) => s.id === d.status);
              return (
                <div key={d.id} className="rounded-xl border border-border p-3">
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
                  {d.description && <p className="mt-1.5 text-xs text-muted-foreground">{d.description}</p>}
                  {d.admin_notes && <p className="mt-1 text-xs font-medium text-primary">{t('disputePanel.decisionIs', { notes: d.admin_notes })}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('disputePanel.noDisputes')}</p>
        )}
      </section>
    </>
  );
}
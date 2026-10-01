import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import TicketThread from '@/components/support/TicketThread';
import { getProfile, getSessionId } from '@/lib/session';
import { fetchMyTickets, openTicket } from '@/lib/customerAccount';
import { formatDateTime } from '@/lib/format';

export default function SupportTickets() {
  const { t } = useTranslation();
  const CATEGORIES = [
    { id: 'order', label: t('supportTickets.catOrder') },
    { id: 'payment', label: t('supportTickets.catPayment') },
    { id: 'delivery', label: t('supportTickets.catDelivery') },
    { id: 'return', label: t('supportTickets.catReturn') },
    { id: 'account', label: t('supportTickets.catAccount') },
    { id: 'other', label: t('supportTickets.catOther') },
  ];

  const STATUS = {
    open: { label: t('supportTickets.statusOpen'), className: 'bg-primary/10 text-primary' },
    in_progress: { label: t('supportTickets.statusInProgress'), className: 'bg-amber-500/10 text-amber-600' },
    waiting_customer: { label: t('supportTickets.statusWaitingCustomer'), className: 'bg-secondary text-foreground' },
    resolved: { label: t('supportTickets.statusResolved'), className: 'bg-emerald-500/10 text-emerald-600' },
    closed: { label: t('supportTickets.statusClosed'), className: 'bg-secondary text-muted-foreground' },
  };
  const profile = getProfile();
  const sessionId = getSessionId();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    category: 'order',
    order_number: '',
    message: '',
    name: profile.name || '',
    phone: profile.phone || '',
    email: profile.email || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const rows = await fetchMyTickets({ sessionId });
    setTickets(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
     
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.subject.trim() || !form.message.trim()) {
      setError(t('supportTickets.subjectRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await openTicket({
        subject: form.subject.trim(),
        category: form.category,
        orderNumber: form.order_number.trim().toUpperCase(),
        message: form.message.trim(),
        name: form.name || 'Client',
        email: form.email,
        phone: form.phone,
      });
      setSuccess(t('supportTickets.ticketOpened', { number: ticket?.ticket_number || '' }));
      setForm({ ...form, subject: '', message: '', order_number: '' });
      await load();
    } catch {
      setError(t('supportTickets.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplied = (updated) => setTickets((prev) => prev.map((tx) => (tx.id === updated.id ? updated : tx)));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">{t('supportTickets.title')}</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t('supportTickets.intro')}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">{t('supportTickets.openTicket')}</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={t('supportTickets.subjectPh')}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder={t('supportTickets.orderNumberPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            placeholder={t('supportTickets.messagePh')}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('supportTickets.namePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t('supportTickets.phonePh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('supportTickets.emailPh')}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
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
            {submitting ? t('supportTickets.sending') : t('supportTickets.submit')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">{t('supportTickets.myTickets', { count: tickets.length })}</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : tickets.length ? (
          <div className="space-y-2.5">
            {tickets.map((tx) => {
              const meta = STATUS[tx.status] || STATUS.open;
              const expanded = openId === tx.id;
              return (
                <div key={tx.id} className="rounded-xl border border-border p-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : tx.id)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tx.subject}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.ticket_number} · {CATEGORIES.find((c) => c.id === tx.category)?.label} · {formatDateTime(tx.created_date)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {tx.order_number && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t('supportTickets.orderLine', { number: tx.order_number })} ·{' '}
                      <Link to="/order-tracking" className="font-semibold text-primary">{t('supportTickets.trackDelivery')}</Link>
                    </p>
                  )}
                  {expanded && <TicketThread ticket={tx} onReplied={handleReplied} />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('supportTickets.noTickets')}</p>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        {t('supportTickets.disputesHintPre')}{' '}
        <Link to="/dispute-center" className="font-semibold text-primary">{t('supportTickets.disputeCenter')}</Link>{t('supportTickets.disputesHintPost')}
      </p>
    </div>
  );
}
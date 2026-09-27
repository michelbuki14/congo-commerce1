import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TicketThread from '@/components/support/TicketThread';
import { getProfile, getSessionId, uid } from '@/lib/session';
import { formatDateTime } from '@/lib/format';

const CATEGORIES = [
  { id: 'order', label: 'Ma commande' },
  { id: 'payment', label: 'Paiement mobile money' },
  { id: 'delivery', label: 'Livraison / retrait' },
  { id: 'return', label: 'Retour ou remboursement' },
  { id: 'account', label: 'Compte et vendeur' },
  { id: 'other', label: 'Autre demande' },
];

const STATUS = {
  open: { label: 'Nouveau', className: 'bg-primary/10 text-primary' },
  in_progress: { label: 'En traitement', className: 'bg-amber-500/10 text-amber-600' },
  waiting_customer: { label: 'En attente de votre réponse', className: 'bg-secondary text-foreground' },
  resolved: { label: 'Résolu', className: 'bg-emerald-500/10 text-emerald-600' },
  closed: { label: 'Fermé', className: 'bg-secondary text-muted-foreground' },
};

export default function SupportTickets() {
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
    const rows = await base44.entities.SupportTicket.filter({ session_id: sessionId }, '-created_date', 30).catch(() => []);
    setTickets(rows);
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
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Indiquez un sujet et décrivez votre demande.');
      return;
    }
    setSubmitting(true);
    try {
      const number = `TCK-${uid('').slice(1, 7).toUpperCase()}`;
      await base44.entities.SupportTicket.create({
        ticket_number: number,
        subject: form.subject.trim(),
        category: form.category,
        status: 'open',
        priority: form.category === 'payment' ? 'high' : 'normal',
        customer_name: form.name || 'Client',
        customer_email: form.email,
        customer_phone: form.phone,
        order_number: form.order_number.trim().toUpperCase(),
        session_id: sessionId,
        messages: [{ author: 'customer', name: form.name || 'Client', body: form.message.trim(), at: new Date().toISOString() }],
      });
      await base44.entities.Notification.create({
        title: 'Nouveau ticket support',
        message: `${form.name || 'Un client'} — ${form.subject.trim()} (${number})`,
        type: 'system',
        audience: 'admin',
        order_number: form.order_number.trim().toUpperCase(),
      });
      setSuccess(`Ticket ${number} ouvert. Un agent vous répond sous 24 h ouvrées.`);
      setForm({ ...form, subject: '', message: '', order_number: '' });
      await load();
    } catch {
      setError("Le ticket n'a pas pu être créé. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplied = (updated) => setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Mes tickets support</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Ouvrez un ticket pour toute question sur une commande, un paiement mobile money, une livraison ou votre compte. Vous
          suivez ici l'avancement et vous échangez directement avec l'équipe.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Ouvrir un ticket</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Sujet de la demande"
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
              placeholder="Numéro de commande (optionnel)"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            placeholder="Décrivez votre demande le plus précisément possible"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Votre nom"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Téléphone"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="E-mail"
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
            {submitting ? 'Envoi…' : 'Envoyer ma demande'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mes tickets ({tickets.length})</h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-secondary" />
        ) : tickets.length ? (
          <div className="space-y-2.5">
            {tickets.map((t) => {
              const meta = STATUS[t.status] || STATUS.open;
              const expanded = openId === t.id;
              return (
                <div key={t.id} className="rounded-xl border border-border p-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : t.id)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.ticket_number} · {CATEGORIES.find((c) => c.id === t.category)?.label} · {formatDateTime(t.created_date)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {t.order_number && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Commande {t.order_number} ·{' '}
                      <Link to="/order-tracking" className="font-semibold text-primary">suivre la livraison</Link>
                    </p>
                  )}
                  {expanded && <TicketThread ticket={t} onReplied={handleReplied} />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun ticket sur cet appareil pour le moment.</p>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        Pour les litiges et remboursements, ouvrez un dossier dans le{' '}
        <Link to="/dispute-center" className="font-semibold text-primary">centre de litiges</Link> : l'arbitrage suit un
        traitement dédié.
      </p>
    </div>
  );
}
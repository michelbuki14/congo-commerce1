import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile, uid } from '@/lib/session';
import { formatDate } from '@/lib/format';

const REASONS = [
  { id: 'not_received', label: 'Article non reçu' },
  { id: 'wrong_product', label: 'Mauvais article reçu' },
  { id: 'damaged', label: 'Article endommagé' },
  { id: 'not_as_described', label: 'Article très différent de la description' },
  { id: 'missing_item', label: 'Article manquant dans le colis' },
  { id: 'changed_mind', label: "Changement d'avis" },
];

export default function Returns() {
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
      setError('Indiquez le numéro de commande concerné.');
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
      setSuccess('Votre demande a été transmise. Un agent vous contactera sous 48 h.');
      setForm({ ...form, order_number: '', product_title: '', description: '' });
      await load();
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Retours & remboursements</h1>

      <Link
        to="/returns-portal"
        className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-sm font-semibold"
      >
        Portail des retours — sélectionnez vos articles
        <span className="text-xs text-primary">Ouvrir</span>
      </Link>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Protection acheteur : vous pouvez ouvrir un retour jusqu'à 7 jours après réception. Joignez des photos si l'article
          est endommagé ou non conforme. Les remboursements partiels sont possibles.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <RotateCcw className="h-4 w-4 text-primary" /> Nouvelle demande
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.order_number}
              onChange={(e) => setForm({ ...form, order_number: e.target.value.toUpperCase() })}
              placeholder="Numéro de commande (CC-…)"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Téléphone"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <input
            value={form.product_title}
            onChange={(e) => setForm({ ...form, product_title: e.target.value })}
            placeholder="Article concerné (optionnel)"
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
            placeholder="Décrivez le problème rencontré"
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
            {submitting ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mes demandes</h2>
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
                {r.resolution_notes && <p className="mt-1 text-xs text-muted-foreground">Réponse : {r.resolution_notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune demande enregistrée sur ce numéro.</p>
        )}
      </section>
    </div>
  );
}
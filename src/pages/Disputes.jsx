import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ShieldCheck, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { getProfile } from '@/lib/session';
import { formatUSD, formatDate } from '@/lib/format';
import { emitEvent } from '@/lib/events';

const TYPES = [
  { id: 'not_received', label: 'Article non reçu' },
  { id: 'wrong_product', label: 'Mauvais article reçu' },
  { id: 'damaged', label: 'Article endommagé' },
  { id: 'not_as_described', label: 'Article très différent de la description' },
  { id: 'missing_item', label: 'Article manquant dans le colis' },
  { id: 'payment_issue', label: 'Problème de paiement' },
];

export default function Disputes() {
  const profile = getProfile();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    order_number: '',
    type: 'not_received',
    description: '',
    phone: profile.phone || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async (phone) => {
    const rows = await base44.entities.Dispute.filter({ customer_phone: phone || '—' }, '-created_date', 30).catch(() => []);
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
      setError('Indiquez le numéro de commande concerné.');
      return;
    }
    setSubmitting(true);
    try {
      const number = form.order_number.trim().toUpperCase();
      const orderRows = await base44.entities.Order.filter({ order_number: number }).catch(() => []);
      const order = orderRows[0];
      await base44.entities.Dispute.create({
        order_number: number,
        customer_name: profile.name || 'Client',
        customer_phone: form.phone || profile.phone || '',
        seller_name: order?.items?.[0]?.seller_name || '',
        type: form.type,
        description: form.description,
        amount_usd: order?.total_usd || 0,
        status: 'open',
        priority: 'normal',
      });
      await base44.entities.Notification.create({
        title: 'Nouveau litige ouvert',
        message: `${profile.name || 'Un client'} ouvre un litige sur ${number}.`,
        type: 'order',
        audience: 'admin',
        order_number: number,
        is_demo: true,
      });
      emitEvent(base44, 'dispute_opened', {
        category: 'risk',
        source: 'Dispute',
        reference: number,
        actorName: profile.name || '',
        actorEmail: profile.email || '',
        description: `${TYPES.find((t) => t.id === form.type)?.label || 'Litige'} sur ${number} — ${profile.name || 'client'}${
          form.description ? ` : ${form.description}` : ''
        }`,
        payload: { type: form.type, amount_usd: order?.total_usd || 0, phone: form.phone || profile.phone || '' },
      });
      setSuccess('Votre litige a été ouvert. Un arbitre examine votre dossier sous 48 h.');
      setForm({ ...form, order_number: '', description: '' });
      await load(form.phone || profile.phone);
    } catch {
      setError("Le litige n'a pas pu être ouvert. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="text-lg font-bold md:text-xl">Litiges & protection acheteur</h1>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Si un article n'arrive pas, arrive abîmé ou ne correspond pas à la description, ouvrez un litige. Notre équipe
          arbitre le dossier entre vous et le vendeur, et un remboursement peut être crédité sur votre portefeuille.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gavel className="h-4 w-4 text-primary" /> Ouvrir un litige
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
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Expliquez ce qui s'est passé (dates, échanges avec le vendeur, photos disponibles…)"
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
            {submitting ? 'Envoi…' : 'Ouvrir le litige'}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Vous pouvez aussi demander un simple retour depuis <Link to="/returns" className="font-semibold text-primary">Retours & remboursements</Link>.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Mes litiges</h2>
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
                {d.admin_notes && <p className="mt-1 text-xs font-medium text-primary">Décision : {d.admin_notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun litige enregistré sur ce numéro.</p>
        )}
      </section>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Send, Smartphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { formatDateTime } from '@/lib/format';
import { deliverEmail, markNotificationSent, smsHref, whatsAppHref } from '@/lib/orderNotifications';

const TABS = [
  { id: 'queued', label: 'À envoyer' },
  { id: 'failed', label: 'Échecs' },
  { id: 'sent', label: 'Envoyés' },
  { id: 'skipped', label: 'Sans contact' },
];

const STYLES = {
  queued: 'bg-amber-100 text-amber-900',
  sent: 'bg-emerald-100 text-emerald-900',
  failed: 'bg-red-100 text-red-900',
  skipped: 'bg-slate-200 text-slate-700',
};

const LABELS = {
  queued: 'À envoyer',
  sent: 'Envoyé',
  failed: 'Échec',
  skipped: 'Sans contact',
};

export default function AdminNotifications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('queued');
  const [busy, setBusy] = useState('');

  const load = async () => {
    const data = await base44.entities.OrderNotification.list('-created_date', 200).catch(() => []);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}),
    [rows],
  );
  const visible = useMemo(() => rows.filter((r) => r.status === tab), [rows, tab]);

  const run = async (id, action) => {
    setBusy(id);
    try {
      await action();
    } finally {
      setBusy('');
      await load();
    }
  };

  const sendWhatsApp = (record) => {
    const href = whatsAppHref(record);
    if (href) window.open(href, '_blank', 'noopener');
    return markNotificationSent(record, 'whatsapp');
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Notifications client" links={ADMIN_LINKS} />

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Send className="h-4 w-4 text-primary" /> Suivi de commande
        </p>
        <p className="mt-1 text-2xl font-black">{counts.sent || 0} message(s) envoyé(s)</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Chaque changement de statut — confirmation d'achat, préparation, expédition, livraison — génère
          automatiquement un message. Les clients avec un e-mail le reçoivent par e-mail ; les autres attendent
          ici une relance WhatsApp ou SMS en un clic.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {t.label} ({counts[t.id] || 0})
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {visible.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">
                  {r.label} · {r.order_number}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {r.customer_name || 'Client'} · {r.customer_email || r.customer_phone || 'aucun contact'} ·{' '}
                  {formatDateTime(r.created_date)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLES[r.status] || 'bg-secondary'}`}>
                {LABELS[r.status] || r.status}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-line rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
              {r.message}
            </p>

            {r.error && <p className="mt-2 text-[11px] text-destructive">{r.error}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {r.customer_email && r.status !== 'sent' && (
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => run(r.id, () => deliverEmail(r))}
                  className="flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Mail className="h-3.5 w-3.5" /> {r.attempts ? "Renvoyer l'e-mail" : "Envoyer l'e-mail"}
                </button>
              )}
              {r.customer_phone && (
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => run(r.id, () => sendWhatsApp(r))}
                  className="flex items-center gap-1 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </button>
              )}
              {r.customer_phone && (
                <a
                  href={smsHref(r)}
                  onClick={() => markNotificationSent(r, 'sms')}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold"
                >
                  <Smartphone className="h-3.5 w-3.5" /> SMS
                </a>
              )}
            </div>
          </div>
        ))}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            Aucun message dans cette catégorie.
          </p>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Headphones, ShieldCheck, Send, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ShoppingAssistant from '@/components/ShoppingAssistant';
import { getProfile } from '@/lib/session';

const FAQ = [
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'M-Pesa, Airtel Money, Orange Money, carte bancaire (Visa / Mastercard), portefeuille Congo Commerce et paiement à la livraison dans les villes desservies.',
  },
  {
    q: 'Combien de temps prend une livraison ?',
    a: '2 à 4 jours à Kinshasa pour les articles locaux, 4 à 8 jours pour les autres villes de la RDC. Les articles importés arrivent sous 12 à 25 jours, avec suivi.',
  },
  {
    q: 'Puis-je retirer ma commande en point relais ?',
    a: 'Oui. À l’étape du paiement, choisissez « Point de retrait » et sélectionnez le point le plus proche. Les frais y sont réduits.',
  },
  {
    q: 'Comment fonctionne la protection acheteur ?',
    a: 'Si votre article n’arrive pas, est endommagé ou ne correspond pas à la description, ouvrez un retour depuis votre profil dans les 7 jours suivant la réception. Notre équipe arbitre et peut rembourser tout ou partie de la commande.',
  },
  {
    q: 'Les frais d’importation sont-ils inclus ?',
    a: 'Oui. Le prix affiché inclut le transport international, les frais d’importation estimés et la logistique locale. Aucun frais supplémentaire n’est demandé à la livraison.',
  },
];

export default function Support() {
  const profile = getProfile();
  const [form, setForm] = useState({ name: profile.name || '', phone: profile.phone || '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSending(true);
    try {
      await base44.entities.Notification.create({
        title: `Message support : ${form.subject || 'Sans objet'}`,
        message: `${form.name || 'Client'} (${form.phone || 'sans téléphone'}) — ${form.message}`,
        type: 'system',
        audience: 'admin',
        is_demo: true,
      });
      setSent(true);
      setForm({ ...form, subject: '', message: '' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="flex items-center gap-2 text-lg font-bold md:text-xl">
        <Headphones className="h-5 w-5 text-primary" /> Aide & support
      </h1>

      <ShoppingAssistant />

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Questions fréquentes</h2>
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Règles de protection acheteur
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>• Article non reçu : remboursement intégral après enquête transporteur.</li>
          <li>• Mauvais article ou article manquant : remplacement ou remboursement.</li>
          <li>• Article endommagé : remboursement partiel ou total selon les preuves fournies.</li>
          <li>• Article très différent de la description : remboursement intégral.</li>
          <li>• Délai d'ouverture : 7 jours après la réception du colis.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Contacter le support</h2>
        {sent ? (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Message envoyé. Notre équipe vous répond dans les 24 h ouvrées.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
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
            </div>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Objet"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              placeholder="Décrivez votre demande"
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {sending ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
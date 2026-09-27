import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, BadgeCheck, AlertCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { getProfile, getSellerApplication, saveSellerApplication } from '@/lib/session';
import { emitEvent } from '@/lib/events';
import { formatDateTime } from '@/lib/format';

const CITIES = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Kolwezi', 'Autre'];

export default function SellerApplication() {
  const profile = getProfile();
  const [application, setApplication] = useState(getSellerApplication());
  const [editing, setEditing] = useState(!application);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shop_name: '',
    owner_name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    city: profile.city || 'Kinshasa',
    commune: '',
    activity: '',
    rccm: '',
    mobile_money: '',
    description: '',
    consent: false,
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.shop_name.trim() || !form.owner_name.trim() || !form.phone.trim()) {
      setError('Le nom de la boutique, le responsable et un téléphone joignable sont obligatoires.');
      return;
    }
    if (!form.consent) {
      setError('Merci d’accepter les règles vendeurs et la politique de confidentialité.');
      return;
    }
    setSubmitting(true);
    try {
      const record = {
        ...form,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      };
      await base44.entities.Notification.create({
        title: 'Nouvelle candidature vendeur',
        message: `${form.shop_name} (${form.city}) — ${form.owner_name} · ${form.phone}`,
        type: 'system',
        audience: 'admin',
      });
      saveSellerApplication(record);
      emitEvent('seller_applied', {
        category: 'seller',
        source: 'SellerApplication',
        reference: form.shop_name,
        actorEmail: form.email || profile.email || '',
        actorName: form.owner_name,
        description: `Candidature vendeur : ${form.shop_name} (${form.city}) — ${form.owner_name} · ${form.phone}`,
        payload: { city: form.city, commune: form.commune, activity: form.activity, phone: form.phone },
      });
      setApplication(record);
      setEditing(false);
    } catch {
      setError("La candidature n'a pas pu être envoyée. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InfoPage
      icon={Store}
      title="Devenir vendeur"
      subtitle="Soumettez les informations de votre activité : notre équipe vérifie le dossier et rattache votre boutique à votre compte sous 48 h."
    >
      {application && !editing ? (
        <InfoSection title="Candidature envoyée">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" /> En attente de validation
            </p>
            <p className="mt-1.5 text-xs">
              <span className="font-semibold text-foreground">{application.shop_name}</span> · {application.city}
              {application.commune ? ` (${application.commune})` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Envoyée le {formatDateTime(application.submitted_at)} · contact {application.phone}
            </p>
          </div>
          <p className="mt-2">
            Un agent vous appelle pour vérifier votre identité et vos références produits. Dès la validation, votre espace
            vendeur et votre portefeuille s'ouvrent automatiquement.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
            >
              Modifier ma candidature
            </button>
            <Link to="/seller" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Accéder à mon espace vendeur
            </Link>
            <Link to="/support-tickets" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              Contacter l'équipe vendeurs
            </Link>
          </div>
        </InfoSection>
      ) : (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <BadgeCheck className="h-4 w-4 text-primary" /> Formulaire d'inscription vendeur
          </h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                placeholder="Nom de la boutique *"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                placeholder="Nom du responsable *"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Téléphone / WhatsApp *"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="E-mail de l'activité"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={form.commune}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
                placeholder="Commune / quartier"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
                placeholder="Type d'activité (mode, beauté, électronique…)"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={form.rccm}
                onChange={(e) => setForm({ ...form, rccm: e.target.value })}
                placeholder="RCCM / registre (optionnel)"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
            <input
              value={form.mobile_money}
              onChange={(e) => setForm({ ...form, mobile_money: e.target.value })}
              placeholder="Numéro mobile money pour les encaissements"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Présentez votre activité : produits, fournisseurs, volume mensuel estimé…"
              className="w-full rounded-lg border border-border bg-background p-3 text-sm"
            />
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                J'accepte les <Link to="/platform-guidelines" className="font-semibold text-primary">règles vendeurs</Link> et la{' '}
                <Link to="/confidentialite" className="font-semibold text-primary">politique de confidentialité</Link>, et je
                certifie vendre des produits licites en RDC.
              </span>
            </label>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? 'Envoi…' : 'Envoyer ma candidature'}
              </button>
              {application && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <InfoSection title="Ce qui est vérifié">
        <ul className="space-y-1.5">
          <li>• Identité du responsable et adresse de stock ou de préparation.</li>
          <li>• Numéro mobile money au nom du titulaire du compte.</li>
          <li>• Conformité des produits : pas de contrefaçon, ni d'articles interdits.</li>
          <li>• Délais de préparation réalistes pour les villes desservies.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, BadgeCheck, AlertCircle, Clock, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import OnboardingStepper from '@/components/onboarding/OnboardingStepper';
import DocumentUploadField from '@/components/onboarding/DocumentUploadField';
import { getProfile, getSellerApplication, saveSellerApplication } from '@/lib/session';
import { emitEvent } from '@/lib/events';
import { formatDateTime } from '@/lib/format';

const CITIES = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Kolwezi', 'Autre'];
const ID_TYPES = [
  { id: 'carte_identite', label: "Carte d'identité" },
  { id: 'passeport', label: 'Passeport' },
  { id: 'permis', label: 'Permis de conduire' },
  { id: 'attestation', label: "Attestation d'identité" },
];
const PAYOUT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'airtel', label: 'Airtel Money' },
  { id: 'orange', label: 'Orange Money' },
  { id: 'bank', label: 'Virement bancaire' },
];

const STEPS = [
  { id: 'business', label: 'Activité' },
  { id: 'identity', label: 'Identité' },
  { id: 'payout', label: 'Paiement' },
  { id: 'review', label: 'Validation' },
];

export default function SellerApplication() {
  const profile = getProfile();
  const [application, setApplication] = useState(getSellerApplication());
  const [editing, setEditing] = useState(!application);
  const [step, setStep] = useState(0);
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
    description: '',
    id_type: 'carte_identite',
    id_number: '',
    id_document: null,
    business_document: null,
    payout_method: 'mpesa',
    payout_holder: profile.name || '',
    payout_account: '',
    payout_bank_name: '',
    consent: false,
  });

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const validateStep = () => {
    if (step === 0 && (!form.shop_name.trim() || !form.owner_name.trim() || !form.phone.trim())) {
      return 'Le nom de la boutique, le responsable et un téléphone joignable sont obligatoires.';
    }
    if (step === 1 && (!form.id_number.trim() || !form.id_document?.file_uri)) {
      return "Renseignez votre pièce d'identité et joignez-en une copie.";
    }
    if (step === 2 && (!form.payout_holder.trim() || !form.payout_account.trim())) {
      return 'Indiquez le titulaire du compte et le numéro qui recevra vos encaissements.';
    }
    return '';
  };

  const next = () => {
    const problem = validateStep();
    setError(problem);
    if (!problem) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.consent) {
      setError('Merci d’accepter les règles vendeurs et la politique de confidentialité.');
      return;
    }
    setSubmitting(true);
    try {
      const record = {
        ...form,
        id_document_uri: form.id_document?.file_uri || '',
        id_document_name: form.id_document?.file_name || '',
        business_document_uri: form.business_document?.file_uri || '',
        business_document_name: form.business_document?.file_name || '',
        submitted_at: new Date().toISOString(),
        status: 'pending',
      };
      await base44.entities.Notification.create({
        title: 'Nouvelle candidature vendeur',
        message: `${form.shop_name} (${form.city}) — ${form.owner_name} · ${form.phone} · dossier ${
          record.id_document_uri ? 'complet' : 'sans pièce d’identité'
        }`,
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
        payload: {
          city: form.city,
          commune: form.commune,
          activity: form.activity,
          phone: form.phone,
          payout_method: form.payout_method,
          documents: [record.id_document_name, record.business_document_name].filter(Boolean),
        },
      });
      setApplication(record);
      setEditing(false);
      setStep(0);
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
      subtitle="Quatre étapes : votre activité, votre identité, vos coordonnées de paiement, puis la validation. Notre équipe vérifie le dossier et rattache votre boutique à votre compte sous 48 h."
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
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Pièce d'identité : {application.id_document_name || 'non fournie'} · encaissement{' '}
              {PAYOUT_METHODS.find((m) => m.id === application.payout_method)?.label || 'à préciser'}
            </p>
          </div>
          <p className="mt-2">
            Un agent vous appelle pour vérifier votre identité et vos références produits. Dès la validation, votre espace
            vendeur et votre portefeuille s'ouvrent automatiquement.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setEditing(true); setStep(0); }}
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
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <BadgeCheck className="h-4 w-4 text-primary" /> Formulaire d'inscription vendeur
          </h2>
          <OnboardingStepper steps={STEPS} current={step} />

          <form onSubmit={submit} className="space-y-3">
            {step === 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.shop_name} onChange={(e) => set({ shop_name: e.target.value })} placeholder="Nom de la boutique *" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.owner_name} onChange={(e) => set({ owner_name: e.target.value })} placeholder="Nom du responsable *" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Téléphone / WhatsApp *" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="E-mail de l'activité" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <select value={form.city} onChange={(e) => set({ city: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={form.commune} onChange={(e) => set({ commune: e.target.value })} placeholder="Commune / quartier" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.activity} onChange={(e) => set({ activity: e.target.value })} placeholder="Type d'activité (mode, beauté, électronique…)" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.rccm} onChange={(e) => set({ rccm: e.target.value })} placeholder="RCCM / registre (optionnel)" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={form.id_type} onChange={(e) => set({ id_type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                    {ID_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <input value={form.id_number} onChange={(e) => set({ id_number: e.target.value })} placeholder="Numéro de la pièce *" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <DocumentUploadField
                  label="Copie de la pièce d'identité *"
                  hint="Photo ou scan lisible du document du responsable de la boutique."
                  value={form.id_document}
                  onChange={(doc) => set({ id_document: doc })}
                />
                <DocumentUploadField
                  label="Document d'entreprise (optionnel)"
                  hint="Registre de commerce, attestation fiscale ou facture fournisseur à votre nom."
                  value={form.business_document}
                  onChange={(doc) => set({ business_document: doc })}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {PAYOUT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => set({ payout_method: m.id })}
                      className={`rounded-xl border px-4 py-3 text-left text-xs font-semibold ${
                        form.payout_method === m.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.payout_holder} onChange={(e) => set({ payout_holder: e.target.value })} placeholder="Titulaire du compte *" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={form.payout_account} onChange={(e) => set({ payout_account: e.target.value })} placeholder={form.payout_method === 'bank' ? 'Numéro de compte *' : 'Numéro mobile money *'} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  {form.payout_method === 'bank' ? (
                    <input value={form.payout_bank_name} onChange={(e) => set({ payout_bank_name: e.target.value })} placeholder="Banque" className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Les versements ne sont faits qu'au nom du titulaire du compte. Un numéro au nom d'un tiers fait échouer la
                  vérification.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="Présentez votre activité : produits, fournisseurs, volume mensuel estimé…" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
                <div className="rounded-xl bg-secondary/50 p-3 text-xs">
                  <p className="font-semibold">Récapitulatif</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>Boutique : {form.shop_name || '—'} · {form.city}{form.commune ? ` (${form.commune})` : ''}</li>
                    <li>Responsable : {form.owner_name || '—'} · {form.phone || '—'}</li>
                    <li>Identité : {ID_TYPES.find((t) => t.id === form.id_type)?.label} {form.id_number || '—'} · {form.id_document?.file_name || 'sans copie'}</li>
                    <li>Encaissement : {PAYOUT_METHODS.find((m) => m.id === form.payout_method)?.label} · {form.payout_account || '—'}</li>
                  </ul>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-4 w-4" />
                  <span>
                    J'accepte les <Link to="/platform-guidelines" className="font-semibold text-primary">règles vendeurs</Link> et la{' '}
                    <Link to="/confidentialite" className="font-semibold text-primary">politique de confidentialité</Link>, et je
                    certifie vendre des produits licites en RDC.
                  </span>
                </label>
              </div>
            ) : null}

            {error ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => { setError(''); setStep((s) => s - 1); }}
                  className="flex items-center gap-1.5 rounded-full border border-border px-5 py-3 text-sm font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" /> Précédent
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {submitting ? 'Envoi…' : 'Envoyer ma candidature'}
                </button>
              )}
              {application ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <InfoSection title="Ce qui est vérifié">
        <ul className="space-y-1.5">
          <li>• Identité du responsable et adresse de stock ou de préparation.</li>
          <li>• Numéro mobile money ou compte bancaire au nom du titulaire du compte.</li>
          <li>• Conformité des produits : pas de contrefaçon, ni d'articles interdits.</li>
          <li>• Délais de préparation réalistes pour les villes desservies.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
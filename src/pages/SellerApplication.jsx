import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
const ID_TYPE_IDS = ['carte_identite', 'passeport', 'permis', 'attestation'];
const PAYOUT_METHOD_IDS = ['mpesa', 'airtel', 'orange', 'bank'];

const STEP_IDS = [
  { id: 'business', key: 'stepBusiness' },
  { id: 'identity', key: 'stepIdentity' },
  { id: 'payout', key: 'stepPayout' },
  { id: 'review', key: 'stepReview' },
];

export default function SellerApplication() {
  const { t } = useTranslation();
  const profile = getProfile();
  const ID_TYPES = ID_TYPE_IDS.map((id) => ({ id, label: t(`sellerApplication.idType_${id}`) }));
  const PAYOUT_METHODS = PAYOUT_METHOD_IDS.map((id) => ({ id, label: t(`sellerApplication.payout_${id}`) }));
  const STEPS = STEP_IDS.map((s) => ({ id: s.id, label: t(`sellerApplication.${s.key}`) }));
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
      return t('sellerApplication.errStep0');
    }
    if (step === 1 && (!form.id_number.trim() || !form.id_document?.file_uri)) {
      return t('sellerApplication.errStep1');
    }
    if (step === 2 && (!form.payout_holder.trim() || !form.payout_account.trim())) {
      return t('sellerApplication.errStep2');
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
      setError(t('sellerApplication.errConsent'));
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
      emitEvent(base44, 'seller_applied', {
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
      setError(t('sellerApplication.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InfoPage
      icon={Store}
      title={t('sellerApplication.title')}
      subtitle={t('sellerApplication.subtitle')}
    >
      {application && !editing ? (
        <InfoSection title={t('sellerApplication.sentTitle')}>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" /> {t('sellerApplication.pending')}
            </p>
            <p className="mt-1.5 text-xs">
              <span className="font-semibold text-foreground">{application.shop_name}</span> · {application.city}
              {application.commune ? ` (${application.commune})` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t('sellerApplication.sentMeta', { date: formatDateTime(application.submitted_at), phone: application.phone })}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t('sellerApplication.idDocLabel')} : {application.id_document_name || t('sellerApplication.notProvided')} · {t('sellerApplication.payoutLabel')}{' '}
              {PAYOUT_METHODS.find((m) => m.id === application.payout_method)?.label || t('sellerApplication.toSpecify')}
            </p>
          </div>
          <p className="mt-2">
{t('sellerApplication.agentNote')}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setEditing(true); setStep(0); }}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
            >
              {t('sellerApplication.editApp')}
            </button>
            <Link to="/seller" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              {t('sellerApplication.gotoSeller')}
            </Link>
            <Link to="/support-tickets" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
              {t('sellerApplication.contactTeam')}
            </Link>
          </div>
        </InfoSection>
      ) : (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <BadgeCheck className="h-4 w-4 text-primary" /> {t('sellerApplication.formTitle')}
          </h2>
          <OnboardingStepper steps={STEPS} current={step} />

          <form onSubmit={submit} className="space-y-3">
            {step === 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.shop_name} onChange={(e) => set({ shop_name: e.target.value })} placeholder={t('sellerApplication.phShop')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.owner_name} onChange={(e) => set({ owner_name: e.target.value })} placeholder={t('sellerApplication.phOwner')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder={t('sellerApplication.phPhone')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder={t('sellerApplication.phEmail')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <select value={form.city} onChange={(e) => set({ city: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={form.commune} onChange={(e) => set({ commune: e.target.value })} placeholder={t('sellerApplication.phCommune')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.activity} onChange={(e) => set({ activity: e.target.value })} placeholder={t('sellerApplication.phActivity')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                <input value={form.rccm} onChange={(e) => set({ rccm: e.target.value })} placeholder={t('sellerApplication.phRccm')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={form.id_type} onChange={(e) => set({ id_type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
                    {ID_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <input value={form.id_number} onChange={(e) => set({ id_number: e.target.value })} placeholder={t('sellerApplication.phIdNumber')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                </div>
                <DocumentUploadField
                  label={t('sellerApplication.idCopyLabel')}
                  hint={t('sellerApplication.idCopyHint')}
                  value={form.id_document}
                  onChange={(doc) => set({ id_document: doc })}
                />
                <DocumentUploadField
                  label={t('sellerApplication.bizDocLabel')}
                  hint={t('sellerApplication.bizDocHint')}
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
                  <input value={form.payout_holder} onChange={(e) => set({ payout_holder: e.target.value })} placeholder={t('sellerApplication.phHolder')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  <input value={form.payout_account} onChange={(e) => set({ payout_account: e.target.value })} placeholder={form.payout_method === 'bank' ? t('sellerApplication.phBankAcct') : t('sellerApplication.phMomo')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  {form.payout_method === 'bank' ? (
                    <input value={form.payout_bank_name} onChange={(e) => set({ payout_bank_name: e.target.value })} placeholder={t('sellerApplication.phBank')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('sellerApplication.payoutWarn')}
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder={t('sellerApplication.phDescribe')} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
                <div className="rounded-xl bg-secondary/50 p-3 text-xs">
                  <p className="font-semibold">{t('sellerApplication.summary')}</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>{t('sellerApplication.sumShop', { shop: form.shop_name || '—', city: form.city, commune: form.commune ? ` (${form.commune})` : '' })}</li>
                    <li>{t('sellerApplication.sumOwner', { owner: form.owner_name || '—', phone: form.phone || '—' })}</li>
                    <li>{t('sellerApplication.sumId', { type: ID_TYPES.find((x) => x.id === form.id_type)?.label, num: form.id_number || '—', doc: form.id_document?.file_name || t('sellerApplication.noCopy') })}</li>
                    <li>{t('sellerApplication.sumPayout', { method: PAYOUT_METHODS.find((m) => m.id === form.payout_method)?.label, acct: form.payout_account || '—' })}</li>
                  </ul>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-4 w-4" />
                  <span>
                    {t('sellerApplication.consentA')} <Link to="/platform-guidelines" className="font-semibold text-primary">{t('sellerApplication.consentRules')}</Link> {t('sellerApplication.consentB')}{' '}
                    <Link to="/confidentialite" className="font-semibold text-primary">{t('sellerApplication.consentPrivacy')}</Link>{t('sellerApplication.consentC')}
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
                  <ArrowLeft className="h-4 w-4" /> {t('sellerApplication.prev')}
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  {t('sellerApplication.next')} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {submitting ? t('sellerApplication.sending') : t('sellerApplication.submit')}
                </button>
              )}
              {application ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-border px-5 py-3 text-sm font-semibold"
                >
                  {t('sellerApplication.cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <InfoSection title={t('sellerApplication.checkedTitle')}>
        <ul className="space-y-1.5">
          <li>• {t('sellerApplication.checked1')}</li>
          <li>• {t('sellerApplication.checked2')}</li>
          <li>• {t('sellerApplication.checked3')}</li>
          <li>• {t('sellerApplication.checked4')}</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
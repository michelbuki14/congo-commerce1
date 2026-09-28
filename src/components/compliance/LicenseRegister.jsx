import React, { useState } from 'react';
import { FileText, Paperclip, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';

const KIND_IDS = ['license', 'tax', 'sector', 'policy'];

const POLICY_STATUSES = ['published', 'review', 'draft'];

const EMPTY = { kind: 'license', label: '', region: '', reference: '', expires_at: '', document_uri: '', document_name: '', policy_status: 'published' };

/** Status of a register entry: policies are manual, everything else follows its expiry date. */
export function registerStatus(entry) {
  if (entry.kind === 'policy') return entry.policy_status === 'published' ? 'valid' : entry.policy_status === 'review' ? 'expiring' : 'draft';
  if (!entry.expires_at) return 'valid';
  const days = (new Date(entry.expires_at) - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}

/**
 * Regional licences, tax documents and regulatory policy statuses. Entries live in
 * the same platform setting as the rest of the compliance configuration, and any
 * supporting document is uploaded to private storage.
 */
export default function LicenseRegister({ entries, onSave }) {
  const { t } = useTranslation();
  const KINDS = KIND_IDS.map((id) => ({ id, label: t(`licenseRegister.kind_${id}`) }));
  const POLICY_LABELS = { published: t('licenseRegister.policyPublished'), review: t('licenseRegister.policyReview'), draft: t('licenseRegister.policyDraft') };
  const STATUS_STYLE = {
    valid: { label: t('licenseRegister.statusValid'), className: 'bg-emerald-100 text-emerald-900' },
    expiring: { label: t('licenseRegister.statusExpiring'), className: 'bg-amber-100 text-amber-900' },
    expired: { label: t('licenseRegister.statusExpired'), className: 'bg-red-100 text-red-900' },
    draft: { label: t('licenseRegister.statusDraft'), className: 'bg-slate-200 text-slate-700' },
  };
  const [draft, setDraft] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setDraft((d) => ({ ...d, document_uri: file_uri, document_name: file.name }));
    } catch {
      setError(t('licenseRegister.uploadError'));
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!draft.label.trim()) {
      setError(t('licenseRegister.labelRequired'));
      return;
    }
    setError('');
    await onSave([
      ...(entries || []),
      { ...draft, id: `reg-${Date.now().toString(36)}`, label: draft.label.trim() },
    ]);
    setDraft(EMPTY);
    setAdding(false);
  };

  const remove = async (id) => {
    await onSave((entries || []).filter((e) => e.id !== id));
  };

  const patch = async (id, changes) => {
    await onSave((entries || []).map((e) => (e.id === id ? { ...e, ...changes } : e)));
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t('licenseRegister.title')}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t('licenseRegister.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> {t('licenseRegister.add')}
        </button>
      </div>

      {adding ? (
        <div className="space-y-2.5 rounded-xl bg-secondary/50 p-3">
          <div className="grid gap-2.5 md:grid-cols-2">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
              className="h-10 rounded-lg border border-input bg-card px-2 text-xs"
            >
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={t('licenseRegister.labelPlaceholder')}
              className="h-10 rounded-lg border border-input bg-card px-3 text-xs"
            />
            <input
              value={draft.reference}
              onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
              placeholder={t('licenseRegister.referencePlaceholder')}
              className="h-10 rounded-lg border border-input bg-card px-3 text-xs"
            />
            <input
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder={t('licenseRegister.regionPlaceholder')}
              className="h-10 rounded-lg border border-input bg-card px-3 text-xs"
            />
            {draft.kind === 'policy' ? (
              <select
                value={draft.policy_status}
                onChange={(e) => setDraft({ ...draft, policy_status: e.target.value })}
                className="h-10 rounded-lg border border-input bg-card px-2 text-xs"
              >
                {POLICY_STATUSES.map((s) => <option key={s} value={s}>{POLICY_LABELS[s]}</option>)}
              </select>
            ) : (
              <label className="text-[11px] text-muted-foreground">
                {t('licenseRegister.expiry')}
                <input
                  type="date"
                  value={draft.expires_at}
                  onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-2 text-xs text-foreground"
                />
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold">
              <Paperclip className="h-3.5 w-3.5" /> {draft.document_name || t('licenseRegister.attach')}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={add}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t('licenseRegister.save')}
            </button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {entries?.length ? (
        <div className="space-y-2">
          {entries.map((e) => {
            const status = registerStatus(e);
            const style = STATUS_STYLE[status];
            return (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {KINDS.find((k) => k.id === e.kind)?.label}
                    {e.region ? ` · ${e.region}` : ''}
                    {e.reference ? t('licenseRegister.refSuffix', { ref: e.reference }) : ''}
                    {e.expires_at ? t('licenseRegister.expirySuffix', { date: formatDate(e.expires_at) }) : ''}
                  </p>
                  {e.document_name ? (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <FileText className="h-3 w-3" /> {e.document_name}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.className}`}>{style.label}</span>
                  {e.kind === 'policy' ? (
                    <select
                      value={e.policy_status || 'published'}
                      onChange={(ev) => patch(e.id, { policy_status: ev.target.value })}
                      className="h-8 rounded-lg border border-border bg-background px-2 text-[11px]"
                    >
                      {POLICY_STATUSES.map((s) => <option key={s} value={s}>{POLICY_LABELS[s]}</option>)}
                    </select>
                  ) : null}
                  <button type="button" onClick={() => remove(e.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          {t('licenseRegister.empty')}
        </p>
      )}
    </section>
  );
}
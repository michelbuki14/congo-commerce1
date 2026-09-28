import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCheck2, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Collects one supporting document (identity, business registration, bank proof)
 * and hands back its private file reference.
 */
export default function DocumentUploadField({ label, hint, value, onChange }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      onChange({ file_uri, file_name: file.name });
    } catch {
      setError(t('documentUploadField.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs font-semibold">{label}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold">
          <Paperclip className="h-3.5 w-3.5" /> {busy ? t('documentUploadField.uploading') : value?.file_name ? t('documentUploadField.replace') : t('documentUploadField.choose')}
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={upload} />
        </label>
        {value?.file_name ? (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-700">
            <FileCheck2 className="h-3.5 w-3.5" /> {value.file_name}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">{t('documentUploadField.noFile')}</span>
        )}
      </div>
      {error ? <p className="mt-1.5 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
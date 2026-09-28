import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, FileCheck2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/** Uploads a delivery proof to private storage and hands the file URI back. */
export default function DisputeProofUpload({ dispute, onUploaded }) {
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
      await onUploaded(dispute, file_uri);
    } catch {
      setError(t('disputeProofUpload.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const view = async () => {
    setBusy(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: dispute.proof_of_delivery,
        expires_in: 300,
      });
      window.open(signed_url, '_blank', 'noopener');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dispute.proof_of_delivery ? (
        <button
          type="button"
          onClick={view}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-40"
        >
          <FileCheck2 className="h-3.5 w-3.5" /> {t('disputeProofUpload.proofLabel')}
        </button>
      ) : null}

      <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {dispute.proof_of_delivery ? t('disputeProofUpload.replaceProof') : t('disputeProofUpload.attachProof')}
        <input type="file" accept="image/*,application/pdf" onChange={upload} disabled={busy} className="hidden" />
      </label>

      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

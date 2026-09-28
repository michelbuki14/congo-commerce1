import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Proof-of-delivery capture: recipient name, the pickup code when the order is
 * collected at a relay point, and the delivery photo. Shared by the job cards
 * and the tracking view so both enforce the same requirements.
 */
export default function CourierProofForm({ order, shipment, busy, onConfirm }) {
  const { t } = useTranslation();
  const [recipient, setRecipient] = useState(order?.customer_name || '');
  const [proofUri, setProofUri] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const needsCode = order?.delivery_method === 'pickup_point' && !!order?.pickup_code;

  const uploadProof = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setProofUri(res.file_uri);
    } catch {
      setUploadError(t('courierProofForm.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setCodeError('');
    if (needsCode && code.trim() !== String(order.pickup_code)) {
      setCodeError(t('courierProofForm.badCode'));
      return;
    }
    await onConfirm({
      delivered_to: recipient,
      proof_of_delivery: proofUri || shipment.proof_of_delivery || '',
      pickup_code: code.trim(),
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder={t('courierProofForm.phRecipient')}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
      />
      {needsCode && (
        <div className="space-y-1">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder={t('courierProofForm.phCode')}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          {codeError && <p className="text-[11px] text-destructive">{codeError}</p>}
        </div>
      )}
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        {t('courierProofForm.proofLabel')}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            uploadProof(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="text-[11px]"
        />
      </label>
      {uploading && <p className="text-[11px] text-muted-foreground">{t('courierProofForm.uploading')}</p>}
      {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
      {proofUri && (
        <p className="flex items-center gap-2 text-[11px] font-medium text-primary">
          {t('courierProofForm.photoAdded')}
          <button
            type="button"
            onClick={() => setProofUri('')}
            className="font-semibold text-muted-foreground underline"
          >
            {t('courierProofForm.remove')}
          </button>
        </p>
      )}
      <button
        type="button"
        disabled={busy || uploading}
        onClick={submit}
        className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {t('courierProofForm.markDelivered')}
      </button>
    </div>
  );
}
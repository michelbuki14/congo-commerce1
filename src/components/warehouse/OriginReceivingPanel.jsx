import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/format';

/**
 * Origin-warehouse receiving for international goods.
 *
 * The supplier delivers into our own warehouse in its country; the team there
 * photographs the goods and sends the picture to the customer, who approves
 * before we ship to the destination. Only the warehouse photo can move the
 * fulfillment into that waiting state.
 */
const RECEIVABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

export default function OriginReceivingPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [warehouse, setWarehouse] = useState({});
  const [photo, setPhoto] = useState({});
  const [uploading, setUploading] = useState('');
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});

  const load = async () => {
    const list = await base44.entities.FulfillmentOrder
      .filter({ source_type: 'international_supplier' }, '-created_date', 200)
      .catch(() => []);
    setRows(list.filter((f) => RECEIVABLE.includes(f.status)));
  };

  useEffect(() => { load(); }, []);

  const uploadPhoto = async (id, file) => {
    if (!file) return;
    setUploading(id);
    setErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setPhoto((prev) => ({ ...prev, [id]: res.file_uri }));
    } catch {
      setErrors((prev) => ({ ...prev, [id]: t('originReceiving.uploadFailed') }));
    } finally {
      setUploading('');
    }
  };

  const receive = async (f) => {
    const place = String(warehouse[f.id] || '').trim();
    if (!place) {
      setErrors((prev) => ({ ...prev, [f.id]: t('originReceiving.warehouseRequired') }));
      return;
    }
    if (!photo[f.id]) {
      setErrors((prev) => ({ ...prev, [f.id]: t('originReceiving.photoRequired') }));
      return;
    }
    setErrors((prev) => ({ ...prev, [f.id]: '' }));
    setBusy(f.id);
    try {
      const res = await base44.functions.invoke('fulfillmentAction', {
        action: 'intlReceive',
        fulfillment_id: f.id,
        origin_warehouse: place,
        origin_photo: photo[f.id],
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setRows((prev) => prev.filter((x) => x.id !== f.id));
      toast({ title: t('originReceiving.sent') });
    } catch (e) {
      setErrors((prev) => ({ ...prev, [f.id]: e?.data?.error || e?.message || t('originReceiving.failed') }));
    } finally {
      setBusy('');
    }
  };

  if (!rows) return <p className="text-sm text-muted-foreground">{t('originReceiving.loading')}</p>;
  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t('originReceiving.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t('originReceiving.helper')}</p>
      {rows.map((f) => (
        <div key={f.id} className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">{f.fulfillment_number}</p>
              <p className="text-xs text-muted-foreground">
                {f.order_number} · {f.supplier_name || '—'} · {t('originReceiving.itemsCount', { count: (f.items || []).length })}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">{f.status}</span>
          </div>

          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {(f.items || []).map((i, k) => (
              <li key={k} className="flex items-center gap-1.5">
                <Package className="h-3 w-3 shrink-0" /> {i.quantity} × {i.title}
              </li>
            ))}
          </ul>

          <input
            value={warehouse[f.id] || ''}
            onChange={(e) => setWarehouse((prev) => ({ ...prev, [f.id]: e.target.value }))}
            placeholder={t('originReceiving.warehousePh')}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />

          <label className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {t('originReceiving.photoLabel')}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { uploadPhoto(f.id, e.target.files?.[0]); e.target.value = ''; }}
              className="text-[11px]"
            />
          </label>
          {uploading === f.id && <p className="text-[11px] text-muted-foreground">{t('originReceiving.uploading')}</p>}
          {photo[f.id] && <p className="text-[11px] font-medium text-primary">{t('originReceiving.photoAdded')}</p>}
          {errors[f.id] && <p className="text-[11px] text-destructive">{errors[f.id]}</p>}

          <button
            type="button"
            disabled={busy === f.id || uploading === f.id}
            onClick={() => receive(f)}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === f.id ? t('originReceiving.sending') : t('originReceiving.submit')}
          </button>
        </div>
      ))}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Package } from 'lucide-react';

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-800',
  inspecting: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  partial: 'bg-orange-100 text-orange-800',
};

export default function ChinaWarehousePanel() {
  const { t } = useTranslation();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('chinaSourcing', { action: 'history', limit: 100 });
      const pos = res?.history || [];
      setReceipts(pos);
    } catch (e) {
      setErrors((p) => ({ ...p, load: e?.message || 'Erreur' }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{t('chinaWarehouse.receipts', 'Réceptions Chine')}</h2>
        <button type="button" onClick={load} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{t('refresh')}</button>
      </div>
      {errors.load && <p className="text-xs text-destructive">{errors.load}</p>}
      <div className="space-y-2">
        {receipts.map((po) => (
          <div key={po.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold">{po.po_number}</p>
                <p className="text-xs text-muted-foreground">{po.supplier_name} → {po.warehouse_name || '—'}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[po.status] || 'bg-muted'}`}>{po.status.toUpperCase()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {po.items?.length || 0} articles</span>
              <span>{t('cost')}: {po.total_cost_usd ? `$${Number(po.total_cost_usd).toFixed(2)}` : '—'}</span>
              <span>{t('expected')}: {po.expected_date || '—'}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {po.status === 'received' && (
                <button type="button" onClick={async () => {
                  await base44.functions.invoke('chinaSourcing', { action: 'inspect', receipt_id: po.id, status: 'approved', notes: 'Qualité OK' });
                  load();
                }} className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white">{t('approve')}</button>
              )}
              {po.status === 'received' && (
                <button type="button" onClick={async () => {
                  await base44.functions.invoke('chinaSourcing', { action: 'inspect', receipt_id: po.id, status: 'rejected', notes: 'Qualité défectueuse' });
                  load();
                }} className="rounded-full bg-destructive px-3 py-1 text-[10px] font-semibold text-white">{t('reject')}</button>
              )}
            </div>
          </div>
        ))}
        {!receipts.length && <p className="text-sm text-muted-foreground">{t('chinaWarehouse.noReceipts', 'Aucune réception')}</p>}
      </div>
    </div>
  );
}

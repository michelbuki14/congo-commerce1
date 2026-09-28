import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Printer, RefreshCw } from 'lucide-react';
import { SHIPMENT_STATUS_LABELS } from '@/lib/logistics';

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function BulkActionBar({ count, allSelected, onToggleAll, onStatus, onPrint, onArchive, archivedView, busy }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('CONFIRMED');
  const btn = 'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50';
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4" />
        {count ? t('bulkActionBar.selectedCount', { count }) : t('bulkActionBar.selectAll')}
      </label>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-full border border-border bg-background px-3 text-xs" disabled={!count || busy}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'SHIPPED' ? t('bulkActionBar.shipped') : SHIPMENT_STATUS_LABELS[s] || s}</option>)}
        </select>
        <button type="button" disabled={!count || busy} onClick={() => onStatus(status)} className={`${btn} bg-primary text-primary-foreground`}>
          <RefreshCw className="h-3.5 w-3.5" /> {t('bulkActionBar.update')}
        </button>
        <button type="button" disabled={!count || busy} onClick={onPrint} className={`${btn} border border-border`}>
          <Printer className="h-3.5 w-3.5" /> {t('bulkActionBar.labels')}
        </button>
        <button type="button" disabled={!count || busy} onClick={onArchive} className={`${btn} border border-border`}>
          {archivedView ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {archivedView ? t('bulkActionBar.unarchive') : t('bulkActionBar.archive')}
        </button>
      </div>
    </div>
  );
}

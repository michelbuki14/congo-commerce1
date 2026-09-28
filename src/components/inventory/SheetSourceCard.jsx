import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const STATUS = { success: ['statusSuccess', 'bg-emerald-100 text-emerald-900'], failed: ['statusFailed', 'bg-red-100 text-red-900'], never: ['statusNever', 'bg-secondary'] };

export default function SheetSourceCard({ source, syncing, onSync, onToggle, onDelete }) {
  const { t } = useTranslation();
  const [labelKey, cls] = STATUS[source.last_status] || STATUS.never;
  const label = t(`sheetSourceCard.${labelKey}`);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{source.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {source.supplier_name || t('sheetSourceCard.allProducts')} · {t('sheetSourceCard.rangeLabel', { range: source.sheet_range || 'A:Z' })}
          </p>
        </div>
        <Switch checked={source.active} onCheckedChange={onToggle} aria-label={t('sheetSourceCard.autoSyncAria')} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{label}</span>
        {source.last_synced_at && <span className="text-muted-foreground">{new Date(source.last_synced_at).toLocaleString('fr-FR')}</span>}
        {source.last_status === 'success' && <span>{t('sheetSourceCard.lastSyncMeta', { rows: source.last_rows, updated: source.last_updated })}</span>}
      </div>
      {source.last_error && <p className="mt-2 text-xs text-destructive">{source.last_error}</p>}
      {source.last_unmatched?.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('sheetSourceCard.unmatched', { refs: source.last_unmatched.slice(0, 10).join(', ') })}{source.last_unmatched.length > 10 ? '…' : ''}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? t('sheetSourceCard.syncing') : t('sheetSourceCard.sync')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
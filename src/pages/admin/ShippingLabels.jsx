import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Download, Trash2, RefreshCw, Search, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DashboardNav } from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatUSD, formatDate } from '@/lib/format';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  generated: 'bg-blue-100 text-blue-800',
  printed: 'bg-emerald-100 text-emerald-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-red-100 text-red-800',
};

const CARRIER_ICONS = {
  dhl: '✈️', fedex: '📦', ups: '🚚', china_post: '📮', ems: '📋', congo_courier: '🏍️', custom: '🏷️',
};

export default function ShippingLabelsPage() {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('shippingLabel', { action: 'list' });
      setLabels(res?.labels || []);
    } catch (e) {
      setErrors((p) => ({ ...p, load: e?.message || 'Erreur' }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePrint = async (ids) => {
    setSaving(true);
    try {
      await base44.functions.invoke('shippingLabel', { action: 'print', label_ids: ids });
      await load();
    } catch (e) {
      setErrors((p) => ({ ...p, print: e?.message }));
    }
    setSaving(false);
  };

  const handlePrintAll = async () => {
    const pending = labels.filter((l) => l.status !== 'printed' && l.status !== 'delivered');
    if (!pending.length) return;
    await handlePrint(pending.map((l) => l.id));
  };

  const filtered = labels.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.order_number.toLowerCase().includes(q) || l.tracking_number.toLowerCase().includes(q) || (l.recipient?.name || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 md:px-6">
      <DashboardNav title={t('shippingLabels.title', 'Shipping Labels')} links={ADMIN_LINKS} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="">{t('allStatus')}</option>
          <option value="pending">Pending</option>
          <option value="generated">Generated</option>
          <option value="printed">Printed</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
        </select>
        <Button onClick={load} variant="outline" size="sm" className="gap-1.5"><RefreshCw className="h-4 w-4" /> {t('refresh')}</Button>
        <Button onClick={handlePrintAll} disabled={saving || !labels.filter((l) => l.status !== 'printed' && l.status !== 'delivered').length} className="gap-1.5">
          <Printer className="h-4 w-4" /> {t('printAll')}
        </Button>
      </div>

      {errors.load && <p className="text-xs text-destructive">{errors.load}</p>}
      {errors.print && <p className="text-xs text-destructive">{errors.print}</p>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((label) => (
          <div key={label.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold">{label.order_number}</p>
                <p className="text-xs text-muted-foreground font-mono">{label.tracking_number}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[label.status] || 'bg-muted'}`}>{label.status.toUpperCase().replace('_', ' ')}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{CARRIER_ICONS[label.carrier] || '📦'} {label.carrier?.replace('_', ' ')}</span>
              {label.shipping_cost_usd > 0 && <span>· {formatUSD(label.shipping_cost_usd)}</span>}
            </div>

            {label.recipient && (
              <div className="rounded-xl bg-secondary/50 p-2 text-xs">
                <p className="font-semibold">{label.recipient.name}</p>
                <p>{label.recipient.address}</p>
                <p>{label.recipient.city}{label.recipient.country ? `, ${label.recipient.country}` : ''}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t('generated')}: {formatDate(label.generated_at)}</span>
              <span>{label.package?.items_count || 0} articles · {label.package?.weight_kg || 0}kg</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => handlePrint([label.id])} disabled={saving} className="flex-1 gap-1.5">
                <Printer className="h-3 w-3" /> {t('print')}
              </Button>
              {label.label_url && (
                <Button size="sm" variant="outline" onClick={() => window.open(label.label_url, '_blank')} className="flex-1 gap-1.5">
                  <Download className="h-3 w-3" /> {t('download')}
                </Button>
              )}
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground md:col-span-3">{t('noLabels', 'Aucune étiquette')}</p>}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Warehouse, Plus, RefreshCw, Package, MapPin, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DashboardNav } from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatUSD } from '@/lib/format';

export default function ChinaWarehousePage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', province: '', address: '', contact_name: '', contact_phone: '', manager_email: '', capacity_sqm: '' });
  const [selectedWh, setSelectedWh] = useState(null);
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('chinaWarehouse', { action: 'list' });
      setWarehouses(res?.warehouses || []);
    } catch (e) {
      setErrors((p) => ({ ...p, load: e?.message || 'Erreur de chargement' }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createWarehouse = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await base44.functions.invoke('chinaWarehouse', { action: 'create', ...form, capacity_sqm: Number(form.capacity_sqm) || 0 });
      setShowForm(false);
      setForm({ name: '', city: '', province: '', address: '', contact_name: '', contact_phone: '', manager_email: '', capacity_sqm: '' });
      await load();
    } catch (e) {
      setErrors({ submit: e?.message || 'Erreur lors de la création' });
    }
    setSaving(false);
  };

  const deleteWarehouse = async (id) => {
    if (!confirm('Supprimer cet entrepôt ?')) return;
    await base44.functions.invoke('chinaWarehouse', { action: 'delete', id });
    await load();
  };

  const viewInventory = async (wh) => {
    setSelectedWh(wh);
    const res = await base44.functions.invoke('chinaWarehouse', { action: 'inventory', warehouse_id: wh.id });
    setInventory(res?.inventory || []);
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 md:px-6">
      <DashboardNav title={t('chinaWarehouse.title', 'China Warehouses')} links={ADMIN_LINKS} />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t('chinaWarehouse.add', 'Ajouter un entrepôt')}
        </Button>
        <Button variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> {t('refresh')}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createWarehouse} className="rounded-2xl border border-border bg-card p-4 space-y-3 md:grid md:grid-cols-3 md:gap-3">
          {errors.submit && <p className="text-xs text-destructive md:col-span-3">{errors.submit}</p>}
          <Input placeholder={t('chinaWarehouse.namePh', 'Nom')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10" />
          <Input placeholder={t('chinaWarehouse.cityPh', 'Ville')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="h-10" />
          <Input placeholder={t('chinaWarehouse.provincePh', 'Province')} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="h-10" />
          <Input placeholder={t('chinaWarehouse.addressPh', 'Adresse')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-10" />
          <Input placeholder={t('chinaWarehouse.contactPh', 'Contact')} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="h-10" />
          <Input placeholder={t('chinaWarehouse.phonePh', 'Téléphone')} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="h-10" />
          <Input placeholder={t('chinaWarehouse.emailPh', 'Email manager')} value={form.manager_email} onChange={(e) => setForm({ ...form, manager_email: e.target.value })} className="h-10" />
          <Input type="number" placeholder={t('chinaWarehouse.capacityPh', 'Capacité m²')} value={form.capacity_sqm} onChange={(e) => setForm({ ...form, capacity_sqm: e.target.value })} className="h-10" />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="h-10">{saving ? t('saving') : t('save')}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-10">{t('cancel')}</Button>
          </div>
        </form>
      )}

      {errors.load && <p className="text-xs text-destructive">{errors.load}</p>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((wh) => (
          <div key={wh.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold flex items-center gap-1.5"><Warehouse className="h-4 w-4 text-primary" /> {wh.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {wh.city}{wh.province ? `, ${wh.province}` : ''}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${wh.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{wh.active !== false ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {wh.product_count} produits</span>
              <span>{wh.total_qty || 0} unités</span>
              {wh.contact_name && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {wh.contact_name}</span>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => viewInventory(wh)} className="flex-1">{t('chinaWarehouse.viewInventory', 'Inventaire')}</Button>
              <Button size="sm" variant="outline" onClick={() => deleteWarehouse(wh.id)}>{t('delete')}</Button>
            </div>
          </div>
        ))}
        {!warehouses.length && <p className="text-sm text-muted-foreground md:col-span-3">{t('chinaWarehouse.none', 'Aucun entrepôt Chine configuré')}</p>}
      </div>

      {selectedWh && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">{t('chinaWarehouse.inventory', 'Inventaire —')} {selectedWh.name}</h2>
            <Button size="sm" variant="outline" onClick={() => setSelectedWh(null)}>{t('close')}</Button>
          </div>
          <StockAdder warehouseId={selectedWh.id} warehouseName={selectedWh.name} onAdded={() => viewInventory(selectedWh)} />
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary"><tr>
                <th className="px-3 py-2 text-left">{t('sku')}</th>
                <th className="px-3 py-2 text-left">{t('product')}</th>
                <th className="px-3 py-2 text-right">{t('onHand')}</th>
                <th className="px-3 py-2 text-right">{t('available')}</th>
                <th className="px-3 py-2 text-right">{t('reserved')}</th>
                <th className="px-3 py-2 text-right">{t('cost')}</th>
                <th className="px-3 py-2 text-right">{t('location')}</th>
              </tr></thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{item.sku}</td>
                    <td className="px-3 py-2">{item.product_title}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_on_hand}</td>
                    <td className="px-3 py-2 text-right font-semibold">{item.quantity_available}</td>
                    <td className="px-3 py-2 text-right">{item.quantity_reserved}</td>
                    <td className="px-3 py-2 text-right">{formatUSD(item.cost_usd)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.location || '—'}</td>
                  </tr>
                ))}
                {!inventory.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{t('chinaWarehouse.noInventory', 'Aucun article')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StockAdder({ warehouseId, warehouseName, onAdded }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ product_id: '', product_title: '', sku: '', quantity: 1, cost_usd: 0, location: '' });
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.entities.Product.list('title', 200).then(setProducts).catch(() => []); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.quantity) return;
    setSaving(true);
    await base44.functions.invoke('chinaWarehouse', {
      action: 'add-stock', warehouse_id: warehouseId, warehouse_name: warehouseName,
      product_id: form.product_id, product_title: form.product_title, sku: form.sku,
      quantity: Number(form.quantity), cost_usd: Number(form.cost_usd) || 0, location: form.location,
    });
    setSaving(false);
    onAdded();
    setForm({ product_id: '', product_title: '', sku: '', quantity: 1, cost_usd: 0, location: '' });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-3 space-y-2 md:grid md:grid-cols-5 md:gap-2">
      <select value={form.product_id} onChange={(e) => { const p = products.find(x => x.id === e.target.value); setForm(f => ({ ...f, product_id: e.target.value, product_title: p?.title || '', sku: p?.sku || '' })); }} className="h-9 rounded-lg border border-border bg-background px-2 text-xs md:col-span-2">
        <option value="">{t('product')}…</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.title} ({p.sku})</option>)}
      </select>
      <input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU" required className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
      <input type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Qté" required className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
      <input type="number" step="0.01" value={form.cost_usd} onChange={(e) => setForm(f => ({ ...f, cost_usd: e.target.value }))} placeholder="Coût USD" className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
      <input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Emplacement" className="h-9 rounded-lg border border-border bg-background px-2 text-xs md:col-span-2" />
      <Button type="submit" disabled={saving} size="sm" className="md:col-span-5">{saving ? t('adding') : t('addStock')}</Button>
    </form>
  );
}
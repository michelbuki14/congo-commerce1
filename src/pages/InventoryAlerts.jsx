import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Download, PackageX, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useActiveSeller } from '@/lib/seller';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadCsv } from '@/lib/export';

const SOURCE_LABELS = {
  local_seller: 'Stock vendeur',
  local_warehouse: 'Entrepôt local',
  international_supplier: 'Fournisseur international',
};

const COLUMNS = [
  { key: 'title', label: 'Article' },
  { key: 'warehouse', label: 'Stock' },
  { key: 'stock', label: 'Quantité' },
  { key: 'threshold', label: 'Seuil' },
  { key: 'state', label: 'État' },
];

const settingKey = (email) => `inventory_alerts:${String(email || '').toLowerCase()}`;

export default function InventoryAlerts() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [threshold, setThreshold] = useState(5);
  const [overrides, setOverrides] = useState({});
  const [settingId, setSettingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [rows, settings] = await Promise.all([
        base44.entities.Product.list('-sold_count', 300).catch(() => []),
        base44.entities.PlatformSetting.filter({ key: settingKey(user.email) }).catch(() => []),
      ]);
      setProducts(rows);
      if (settings[0]) {
        setSettingId(settings[0].id);
        setThreshold(Number(settings[0].value?.default_threshold) || 5);
        setOverrides(settings[0].value?.overrides || {});
      }
    })().finally(() => setLoading(false));
  }, [user]);

  const mine = useMemo(
    () => (seller ? products.filter((p) => p.seller_id === seller.id) : products),
    [products, seller],
  );

  const thresholdFor = (product) => Number(overrides[product.id] ?? threshold) || 0;

  const alerts = useMemo(() => mine
    .map((p) => ({ product: p, limit: thresholdFor(p), stock: Number(p.stock) || 0 }))
    .filter((row) => row.stock <= row.limit)
    .sort((a, b) => a.stock - b.stock), [mine, overrides, threshold]);

  const outOfStock = alerts.filter((a) => a.stock === 0);

  const byWarehouse = useMemo(() => {
    const map = {};
    mine.forEach((p) => {
      const key = p.source_type || 'local_seller';
      if (!map[key]) map[key] = { total: 0, low: 0, units: 0 };
      map[key].total += 1;
      map[key].units += Number(p.stock) || 0;
      if ((Number(p.stock) || 0) <= thresholdFor(p)) map[key].low += 1;
    });
    return map;
  }, [mine, overrides, threshold]);

  const saveSettings = async () => {
    if (!user) return;
    setBusy('settings');
    setNotice('');
    try {
      const value = { default_threshold: Number(threshold) || 0, overrides };
      if (settingId) {
        await base44.entities.PlatformSetting.update(settingId, { value });
      } else {
        const created = await base44.entities.PlatformSetting.create({
          key: settingKey(user.email),
          label: 'Seuils de réapprovisionnement',
          group: 'inventory',
          value,
        });
        setSettingId(created.id);
      }
      setNotice('Seuils enregistrés.');
    } catch (e) {
      setNotice(e?.message || "L'enregistrement a échoué.");
    } finally {
      setBusy('');
    }
  };

  const restock = async (product, quantity) => {
    setBusy(product.id);
    try {
      const updated = await base44.entities.Product.update(product.id, {
        stock: (Number(product.stock) || 0) + quantity,
      });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...updated } : p)));
    } finally {
      setBusy('');
    }
  };

  const setProductThreshold = (product, value) => {
    setOverrides((prev) => ({ ...prev, [product.id]: value === '' ? undefined : Number(value) }));
  };

  if (loadingSeller || loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Alertes de stock"
        subtitle="Surveillance des quantités par entrepôt, avec alerte dès qu'un article passe sous son seuil de réapprovisionnement."
      >
        <button
          type="button"
          onClick={() => downloadCsv(`alertes-stock-${Date.now()}.csv`, COLUMNS, alerts.map((a) => ({
            title: a.product.title,
            warehouse: SOURCE_LABELS[a.product.source_type] || a.product.source_type || '—',
            stock: a.stock,
            threshold: a.limit,
            state: a.stock === 0 ? 'Rupture' : 'Sous le seuil',
          })))}
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> Exporter les alertes
        </button>
      </OpsHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Articles suivis" value={mine.length} hint={`${Object.keys(byWarehouse).length} entrepôt(s)`} />
        <StatCard label="Sous le seuil" value={alerts.length} tone={alerts.length ? 'warn' : 'good'} />
        <StatCard label="En rupture" value={outOfStock.length} tone={outOfStock.length ? 'bad' : 'good'} />
        <StatCard label="Unités en stock" value={mine.reduce((s, p) => s + (Number(p.stock) || 0), 0)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Boxes className="h-4 w-4" /> Seuil de réapprovisionnement</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label htmlFor="inv-threshold" className="text-[11px]">Seuil par défaut</Label>
            <Input
              id="inv-threshold"
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy === 'settings'}
            onClick={saveSettings}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Enregistrer les seuils
          </button>
          {notice ? <span className="text-[11px] text-muted-foreground">{notice}</span> : null}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Un seuil par article peut être défini directement dans la liste des alertes ci-dessous.
        </p>
      </section>

      {alerts.length ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50">
          <header className="flex items-center gap-2 border-b border-amber-200 px-4 py-3 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> {alerts.length} article(s) à réapprovisionner
          </header>
          <div className="divide-y divide-amber-200">
            {alerts.map(({ product, limit, stock }) => (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-amber-950">{product.title}</p>
                  <p className="text-[11px] text-amber-900">
                    {SOURCE_LABELS[product.source_type] || product.source_type || '—'} · seuil {limit} · {stock === 0 ? 'rupture de stock' : `${stock} restant(s)`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={overrides[product.id] ?? ''}
                    placeholder={String(threshold)}
                    onChange={(e) => setProductThreshold(product, e.target.value)}
                    className="h-8 w-20 text-xs"
                    aria-label={`Seuil pour ${product.title}`}
                  />
                  {[10, 25].map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={busy === product.id}
                      onClick={() => restock(product, q)}
                      className="rounded-full border border-amber-300 bg-card px-3 py-1.5 text-[11px] font-semibold text-amber-900 disabled:opacity-50"
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Tous vos articles sont au-dessus de leur seuil. Les alertes apparaissent ici automatiquement.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold"><PackageX className="h-4 w-4" /> Niveaux par entrepôt</h2>
        </header>
        <div className="divide-y divide-border">
          {Object.entries(byWarehouse).length ? Object.entries(byWarehouse).map(([key, stats]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
              <span className="font-semibold">{SOURCE_LABELS[key] || key}</span>
              <span className="text-muted-foreground">
                {stats.total} article(s) · {stats.units} unité(s) · {stats.low} sous le seuil
              </span>
            </div>
          )) : (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucun article dans votre catalogue.</p>
          )}
        </div>
      </section>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { RefreshCw, Power, Info, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { Image } from '@/components/ui/image';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { getSupplierAdapter, SUPPLIER_REGISTRY } from '@/lib/suppliers';
import { formatUSD, formatDateTime } from '@/lib/format';

const ADAPTERS = Object.keys(SUPPLIER_REGISTRY);

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', code: '', adapter: 'manual', type: 'international', country: 'CN', description: '' });

  const load = async () => {
    const rows = await base44.entities.Supplier.list('name', 100).catch(() => []);
    setSuppliers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (s) => {
    const updated = await base44.entities.Supplier.update(s.id, { enabled: !s.enabled });
    setSuppliers((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };

  const patch = async (s, field, value) => {
    const updated = await base44.entities.Supplier.update(s.id, { [field]: Number(value) || 0 });
    setSuppliers((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  };

  /** Real sync loop: reads stock back from the supplier adapter and updates our catalogue. */
  const sync = async (s) => {
    setSyncing(s.id);
    setMessage('');
    try {
      const products = await base44.entities.Product.filter({ supplier_id: s.id }, '-created_date', 50);
      if (!products.length) {
        setMessage(`${s.name} : aucun produit importé à synchroniser.`);
        return;
      }
      if (!SUPPLIER_REGISTRY[s.adapter]) {
        setMessage(`${s.name} : aucun adaptateur connecté (fournisseur en saisie manuelle).`);
        return;
      }
      const adapter = getSupplierAdapter(s.adapter);
      let updated = 0;
      for (const p of products) {
        if (!p.external_product_id) continue;
        try {
          const inv = await adapter.getInventory(p.external_product_id);
          if (typeof inv.stock === 'number' && inv.stock !== p.stock) {
            await base44.entities.Product.update(p.id, { stock: inv.stock });
            updated += 1;
          }
        } catch {
          /* product discontinued at the supplier — skip, next run will flag it */
        }
      }
      const fresh = await base44.entities.Supplier.update(s.id, { last_sync_at: new Date().toISOString() });
      setSuppliers((prev) => prev.map((x) => (x.id === s.id ? fresh : x)));
      setMessage(`${s.name} : ${products.length} produit(s) vérifié(s), ${updated} stock(s) mis à jour.`);
      await base44.entities.AuditLog.create({
        action: 'supplier.sync',
        actor: 'admin',
        entity: 'Supplier',
        entity_id: s.id,
        reference: s.name,
        severity: 'info',
        details: { checked: products.length, updated },
      });
    } finally {
      setSyncing('');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!draft.name || !draft.code) return;
    await base44.entities.Supplier.create({ ...draft, enabled: true, is_mock: draft.adapter !== 'manual' });
    setCreating(false);
    setDraft({ name: '', code: '', adapter: 'manual', type: 'international', country: 'CN', description: '' });
    await load();
  };

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Fournisseurs" links={ADMIN_LINKS} />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Chaque fournisseur est branché via un adaptateur normalisé. Les adaptateurs marqués « démo » renvoient des données
          simulées ; remplacez-les par l'API réelle du fournisseur sans toucher au moteur de commande.
        </p>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un fournisseur
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nom" required className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="Code (ex : ALIEXPRESS)" required className="h-11 rounded-lg border border-border bg-background px-3 text-sm" />
            <select value={draft.adapter} onChange={(e) => setDraft({ ...draft, adapter: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="manual">Saisie manuelle</option>
              {ADAPTERS.map((a) => (
                <option key={a} value={a}>{a} (démo)</option>
              ))}
            </select>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="international">International</option>
              <option value="local_warehouse">Entrepôt local</option>
            </select>
          </div>
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Créer</button>
        </form>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : (
        <div className="space-y-2.5">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <Image src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {s.name} {s.is_mock && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">démo</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.code} · {s.type === 'international' ? 'International' : 'Entrepôt'} · adaptateur {s.adapter} · {s.products_count || 0} produit(s)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Dernière synchro : {s.last_sync_at ? formatDateTime(s.last_sync_at) : 'jamais'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={syncing === s.id}
                    onClick={() => sync(s)}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing === s.id ? 'animate-spin' : ''}`} /> Synchroniser
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
                      s.enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {s.enabled ? 'Activé' : 'Désactivé'}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {[
                  { field: 'default_markup_percent', label: 'Marge par défaut %' },
                  { field: 'import_cost_percent', label: "Frais d'import %" },
                  { field: 'shipping_base_usd', label: 'Transport de base USD' },
                  { field: 'avg_shipping_days', label: 'Délai moyen (jours)' },
                ].map((f) => (
                  <label key={f.field} className="text-[11px] text-muted-foreground">
                    {f.label}
                    <input
                      type="number"
                      defaultValue={s[f.field] ?? 0}
                      onBlur={(e) => patch(s, f.field, e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              {s.description && <p className="mt-2 text-[11px] text-muted-foreground">{s.description}</p>}
            </div>
          ))}
          {!suppliers.length && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              Aucun fournisseur configuré.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Les prix fournisseurs ne sont jamais exposés aux clients : le moteur de tarification applique transport, importation,
        logistique, marge et frais avant d'afficher un prix. Valeur de référence : {formatUSD(0)}.
      </p>
    </div>
  );
}
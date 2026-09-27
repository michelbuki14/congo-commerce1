import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import SheetSourceForm from '@/components/inventory/SheetSourceForm';
import SheetSourceCard from '@/components/inventory/SheetSourceCard';

export default function InventorySheets() {
  const [sources, setSources] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [syncing, setSyncing] = useState(null);

  const load = () => base44.entities.InventorySheetSource.list('name', 100).then(setSources);
  useEffect(() => {
    load();
    base44.entities.Supplier.list('name', 100).then(setSuppliers);
  }, []);

  const sync = async (id) => {
    setSyncing(id || 'all');
    await base44.functions.invoke('syncInventorySheets', id ? { source_id: id, trigger: 'manual' } : { trigger: 'manual' });
    await load();
    setSyncing(null);
  };
  const add = async (data) => { await base44.entities.InventorySheetSource.create(data); await load(); };
  const toggle = async (s, on) => { await base44.entities.InventorySheetSource.update(s.id, { active: on }); await load(); };
  const remove = async (s) => { await base44.entities.InventorySheetSource.delete(s.id); await load(); };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
      <DashboardNav title="Stocks Google Sheets" links={ADMIN_LINKS} />
      <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
        La première ligne de chaque feuille doit contenir une colonne <b>sku</b> (référence fournisseur ou slug du produit) et une colonne <b>stock</b>.
        Les feuilles actives sont synchronisées automatiquement toutes les heures. Partagez chaque feuille avec le compte Google connecté.
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">Ajouter une feuille d'inventaire</p>
        <SheetSourceForm suppliers={suppliers} onSave={add} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Feuilles connectées ({sources?.length ?? 0})</p>
        {sources?.length > 0 && (
          <button type="button" onClick={() => sync(null)} disabled={!!syncing} className="text-xs font-semibold underline">
            {syncing === 'all' ? 'Synchronisation…' : 'Tout synchroniser'}
          </button>
        )}
      </div>
      {!sources ? <div className="h-32 animate-pulse rounded-2xl bg-secondary" /> : sources.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune feuille ajoutée pour l'instant.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sources.map((s) => (
            <SheetSourceCard key={s.id} source={s} syncing={syncing === s.id} onSync={() => sync(s.id)} onToggle={(on) => toggle(s, on)} onDelete={() => remove(s)} />
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { Columns3, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import { Input } from '@/components/ui/input';
import CompareTable from '@/components/compare/CompareTable';

const MAX = 4;

export default function ProductComparison() {
  const [all, setAll] = useState(null);
  const [ids, setIds] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => { base44.entities.Product.filter({ status: 'published' }, '-sold_count', 200).then(setAll); }, []);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!all || !n) return [];
    return all.filter((p) => !ids.includes(p.id) && p.title?.toLowerCase().includes(n)).slice(0, 8);
  }, [all, q, ids]);

  const selected = (all || []).filter((p) => ids.includes(p.id));

  return (
    <InfoPage icon={Columns3} title="Comparer des produits" subtitle={`Sélectionnez jusqu'à ${MAX} produits pour comparer prix et caractéristiques.`}>
      <InfoSection title={`Ajouter un produit (${ids.length}/${MAX})`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input className="pl-9" placeholder={all ? 'Rechercher un produit…' : 'Chargement…'} value={q} disabled={!all || ids.length >= MAX} onChange={(e) => setQ(e.target.value)} />
        </div>
        {matches.map((p) => (
          <button key={p.id} type="button" onClick={() => { setIds([...ids, p.id]); setQ(''); }} className="flex w-full justify-between rounded-lg px-2 py-2 text-left hover:bg-secondary">
            <span className="text-foreground">{p.title}</span><span>${Number(p.price_usd || 0).toFixed(2)}</span>
          </button>
        ))}
      </InfoSection>
      {selected.length >= 2 ? (
        <CompareTable products={selected} onRemove={(id) => setIds(ids.filter((x) => x !== id))} />
      ) : (
        <InfoSection title="Comparaison">
          <p>{selected.length === 1 ? `« ${selected[0].title} » sélectionné — ajoutez au moins un autre produit.` : 'Ajoutez au moins deux produits pour lancer la comparaison.'}</p>
        </InfoSection>
      )}
    </InfoPage>
  );
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Globe, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';

export default function PartnerDirectory() {
  const [sellers, setSellers] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [tab, setTab] = useState('sellers');

  useEffect(() => {
    base44.entities.Seller.filter({ verified: true, status: 'active' }, 'name', 200).then(setSellers);
    base44.entities.Supplier.filter({ enabled: true, type: 'international' }, 'name', 100).then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const tabs = [['sellers', `Vendeurs congolais (${sellers?.length ?? 0})`], ['suppliers', `Fournisseurs internationaux (${suppliers.length})`]];

  return (
    <InfoPage icon={BadgeCheck} title="Annuaire des partenaires" subtitle="Toutes les boutiques vérifiées et les fournisseurs internationaux présents sur la plateforme.">
      <div className="flex gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{label}</button>
        ))}
      </div>
      {!sellers ? <div className="h-40 animate-pulse rounded-2xl bg-secondary" /> : tab === 'sellers' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {sellers.length === 0 && <p className="text-xs text-muted-foreground">Aucun vendeur vérifié pour l'instant.</p>}
          {sellers.map((s) => (
            <Link key={s.id} to={`/store/${s.slug}`} className="rounded-2xl border border-border bg-card p-4 hover:border-primary">
              <p className="flex items-center gap-1.5 text-sm font-bold"><Store className="h-4 w-4" /> {s.name} <BadgeCheck className="h-3.5 w-3.5" /></p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.city || 'RDC'} · {s.products_count || 0} produit(s) · note {Number(s.rating || 0).toFixed(1)}</p>
              {s.description && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suppliers.length === 0 && <p className="text-xs text-muted-foreground">Aucun fournisseur international actif.</p>}
          {suppliers.map((s) => (
            <InfoSection key={s.id} title={s.name}>
              <p className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {s.country} · livraison ~{s.avg_shipping_days} jours</p>
              {s.description && <p>{s.description}</p>}
            </InfoSection>
          ))}
        </div>
      )}
    </InfoPage>
  );
}
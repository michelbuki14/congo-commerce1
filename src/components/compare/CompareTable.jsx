import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const ROWS = [
  ['Prix', (p) => `$${Number(p.price_usd || 0).toFixed(2)}`],
  ['Prix barré', (p) => (p.compare_at_usd ? `$${Number(p.compare_at_usd).toFixed(2)}` : '—')],
  ['Catégorie', (p) => p.category_name || '—'],
  ['Marque', (p) => p.brand || '—'],
  ['Vendeur', (p) => p.seller_name || p.supplier_name || '—'],
  ['Note', (p) => (p.rating ? `${Number(p.rating).toFixed(1)} (${p.reviews_count || 0} avis)` : '—')],
  ['Stock', (p) => p.stock ?? '—'],
  ['Poids', (p) => (p.weight_kg ? `${p.weight_kg} kg` : '—')],
  ['Dimensions', (p) => p.dimensions || '—'],
  ['Origine', (p) => p.origin_country || '—'],
  ['Livraison estimée', (p) => p.estimated_delivery || '—'],
];

export default function CompareTable({ products, onRemove }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[520px] text-xs">
        <thead>
          <tr>
            <th className="w-32 p-3" />
            {products.map((p) => (
              <th key={p.id} className="p-3 text-left align-top">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/product/${p.slug}`} className="font-bold hover:underline">{p.title}</Link>
                  <button type="button" aria-label="Retirer" onClick={() => onRemove(p.id)}><X className="h-3.5 w-3.5" /></button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROWS.map(([label, get]) => (
            <tr key={label}>
              <td className="p-3 font-semibold text-muted-foreground">{label}</td>
              {products.map((p) => <td key={p.id} className="p-3">{get(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
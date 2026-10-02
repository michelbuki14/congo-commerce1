import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const ROW_DEFS = [
  ['price', (p) => `$${Number(p.price_usd || 0).toFixed(2)}`],
  ['compareAt', (p) => (p.compare_at_usd ? `$${Number(p.compare_at_usd).toFixed(2)}` : '—')],
  ['category', (p) => p.category_name || '—'],
  ['brand', (p) => p.brand || '—'],
  ['seller', (p) => p.seller_name || p.supplier_name || '—'],
  ['rating', (p, t) => (p.rating ? t('compareTable.ratingValue', { rating: Number(p.rating).toFixed(1), count: p.reviews_count || 0 }) : '—')],
  ['stock', (p) => p.stock ?? '—'],
  ['weight', (p, t) => (p.weight_kg ? t('compareTable.weightKg', { w: p.weight_kg }) : '—')],
  ['dimensions', (p) => p.dimensions || '—'],
  ['origin', (p) => p.origin_country || '—'],
  ['delivery', (p) => p.estimated_delivery || '—'],
];

export default memo(function CompareTable({ products, onRemove }) {
  const { t } = useTranslation();
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
                  <button type="button" aria-label={t('compareTable.remove')} onClick={() => onRemove(p.id)}><X className="h-3.5 w-3.5" /></button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROW_DEFS.map(([key, get]) => (
            <tr key={key}>
              <td className="p-3 font-semibold text-muted-foreground">{t(`compareTable.${key}`)}</td>
              {products.map((p) => <td key={p.id} className="p-3">{get(p, t)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
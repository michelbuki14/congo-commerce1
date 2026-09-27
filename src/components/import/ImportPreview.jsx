import React from 'react';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { formatUSD } from '@/lib/format';

/** Preview of what a CSV will create, before anything is written. */
export default function ImportPreview({ products = [], issues = [], totalRows = 0, publishDirect, onTogglePublish, onConfirm, importing }) {
  const publishable = products.filter((p) => p.status === 'published').length;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Aperçu de l'import</h2>
        <span className="text-[11px] text-muted-foreground">
          {totalRows} ligne(s) lue(s) · {products.length} produit(s) valide(s) · {issues.length} à corriger
        </span>
      </div>

      {products.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">Titre</th>
                <th className="py-2">Prix</th>
                <th className="py-2">Catégorie</th>
                <th className="py-2">Stock</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((product, index) => (
                <tr key={`${product.slug}-${index}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{product.title}</td>
                  <td className="py-2 pr-3">{formatUSD(product.price_usd)}</td>
                  <td className="py-2 pr-3">{product.category_name || '—'}</td>
                  <td className="py-2 pr-3">{product.stock}</td>
                  <td className="py-2">{product.status === 'published' ? 'Publié' : 'Brouillon'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 10 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">… et {products.length - 10} autre(s) produit(s).</p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Aucune ligne valide détectée dans ce fichier.
        </p>
      )}

      {issues.length ? (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-3.5 w-3.5" /> Lignes ignorées
          </p>
          {issues.slice(0, 8).map((issue, index) => (
            <p key={`${issue.line}-${index}`}>Ligne {issue.line} — {issue.title} : {issue.message}</p>
          ))}
          {issues.length > 8 ? <p>… et {issues.length - 8} autre(s).</p> : null}
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={publishDirect} onChange={(e) => onTogglePublish(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          Publier directement les {products.length} produit(s) dans ma boutique
          <span className="block text-[11px] text-muted-foreground">
            Décoché, ils arrivent en brouillon : vous les relisez et les publiez depuis Mes produits.
            {publishDirect && publishable ? '' : ''}
          </span>
        </span>
      </label>

      <button
        type="button"
        disabled={!products.length || importing}
        onClick={onConfirm}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {importing ? <Upload className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
        {importing ? 'Import en cours…' : `Importer ${products.length} produit(s)`}
      </button>
    </section>
  );
}
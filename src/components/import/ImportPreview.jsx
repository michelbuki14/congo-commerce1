import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { formatUSD } from '@/lib/format';

/** Preview of what a CSV will create, before anything is written. */
export default memo(function ImportPreview({ products = [], issues = [], totalRows = 0, publishDirect, onTogglePublish, onConfirm, importing }) {
  const { t } = useTranslation();
  const publishable = products.filter((p) => p.status === 'published').length;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{t('importPreview.title')}</h2>
        <span className="text-[11px] text-muted-foreground">
          {t('importPreview.summary', { rows: totalRows, valid: products.length, issues: issues.length })}
        </span>
      </div>

      {products.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2">{t('importPreview.colTitle')}</th>
                <th className="py-2">{t('importPreview.colPrice')}</th>
                <th className="py-2">{t('importPreview.colCategory')}</th>
                <th className="py-2">{t('importPreview.colStock')}</th>
                <th className="py-2">{t('importPreview.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((product, index) => (
                <tr key={`${product.slug}-${index}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{product.title}</td>
                  <td className="py-2 pr-3">{formatUSD(product.price_usd)}</td>
                  <td className="py-2 pr-3">{product.category_name || '—'}</td>
                  <td className="py-2 pr-3">{product.stock}</td>
                  <td className="py-2">{product.status === 'published' ? t('importPreview.published') : t('importPreview.draft')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length > 10 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">{t('importPreview.moreRows', { count: products.length - 10 })}</p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {t('importPreview.noValid')}
        </p>
      )}

      {issues.length ? (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="h-3.5 w-3.5" /> {t('importPreview.skippedTitle')}
          </p>
          {issues.slice(0, 8).map((issue, index) => (
            <p key={`${issue.line}-${index}`}>{t('importPreview.skippedRow', { line: issue.line, title: issue.title, message: issue.message })}</p>
          ))}
          {issues.length > 8 ? <p>{t('importPreview.moreIssues', { count: issues.length - 8 })}</p> : null}
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={publishDirect} onChange={(e) => onTogglePublish(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          {t('importPreview.publishDirect', { count: products.length })}
          <span className="block text-[11px] text-muted-foreground">
            {t('importPreview.publishHint')}
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
        {importing ? t('importPreview.importing') : t('importPreview.importBtn', { count: products.length })}
      </button>
    </section>
  );
});
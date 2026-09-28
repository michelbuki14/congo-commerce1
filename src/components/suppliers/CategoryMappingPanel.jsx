import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Info, Layers } from 'lucide-react';
import { getSupplierAdapter, SUPPLIER_REGISTRY } from '@/lib/suppliers';

/**
 * Maps a supplier's own category labels onto the marketplace categories, so an
 * imported product lands in the right aisle. External labels are read from the
 * supplier adapter itself; a manual supplier can be mapped by typing the label.
 */
export default function CategoryMappingPanel({ supplier, categories, onSave }) {
  const { t } = useTranslation();
  const [external, setExternal] = useState([]);
  const [draft, setDraft] = useState(supplier.category_map || {});
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!SUPPLIER_REGISTRY[supplier.adapter]) {
        if (!cancelled) setExternal(Object.keys(supplier.category_map || {}));
        return;
      }
      try {
        const rows = await getSupplierAdapter(supplier.adapter).searchProducts('', supplier);
        const labels = [...new Set(rows.map((r) => r.category).filter(Boolean))];
        if (!cancelled) setExternal([...new Set([...labels, ...Object.keys(supplier.category_map || {})])]);
      } catch {
        if (!cancelled) setExternal(Object.keys(supplier.category_map || {}));
      }
    })();
    return () => { cancelled = true; };
  }, [supplier]);

  const save = async (next) => {
    setBusy(true);
    setMessage('');
    try {
      await onSave(next);
      setMessage(t('categoryMappingPanel.saved'));
    } finally {
      setBusy(false);
    }
  };

  const mapped = Object.values(draft).filter(Boolean).length;

  return (
    <div className="mt-3 space-y-2.5 rounded-xl bg-secondary/50 p-3">
      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
{t('categoryMappingPanel.intro', { mapped, total: external.length || 0 })}
      </p>

      {external.length ? (
        <div className="space-y-2">
          {external.map((label) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
              <select
                value={draft[label] || ''}
                onChange={(e) => setDraft({ ...draft, [label]: e.target.value })}
                className="h-9 w-56 rounded-lg border border-border bg-card px-2 text-xs"
              >
                <option value="">{t('categoryMappingPanel.unmapped')}</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {t('categoryMappingPanel.noExternal')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder={t('categoryMappingPanel.addPh')}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-xs"
        />
        <button
          type="button"
          onClick={() => {
            if (!manual.trim()) return;
            setExternal((prev) => [...new Set([...prev, manual.trim()])]);
            setManual('');
          }}
          className="rounded-full border border-border px-3.5 py-1.5 text-[11px] font-semibold"
        >
          {t('categoryMappingPanel.add')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(draft)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> {t('categoryMappingPanel.save')}
        </button>
      </div>

      {message ? (
        <p className="flex items-center gap-1.5 text-[11px] text-emerald-700">
          <Info className="h-3.5 w-3.5" /> {message}
        </p>
      ) : null}
    </div>
  );
}
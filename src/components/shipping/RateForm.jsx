import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

const DEFAULTS = {
  destination_type: 'city',
  destination: '',
  courier_id: '',
  min_weight_kg: 0,
  max_weight_kg: 1,
  max_dimension_cm: 0,
  base_usd: 3,
  per_kg_usd: 1,
  surcharge_usd: 0,
  eta_days: '2-4',
  priority: 0,
};

const FIELD_IDS = [
  { field: 'base_usd', step: '0.1' },
  { field: 'per_kg_usd', step: '0.1' },
  { field: 'surcharge_usd', step: '0.1' },
  { field: 'min_weight_kg', step: '0.1' },
  { field: 'max_weight_kg', step: '0.1' },
  { field: 'max_dimension_cm', step: '1' },
];

/** Adds one row to the shipping rate table. */
export default function RateForm({ couriers = [], destinations = [], onSubmit, busy }) {
  const { t } = useTranslation();
  const FIELDS = FIELD_IDS.map((f) => ({ ...f, label: t(`rateForm.field_${f.field}`) }));
  const [draft, setDraft] = useState({ ...DEFAULTS, courier_id: couriers[0]?.id || '', destination: destinations[0] || '' });
  const [error, setError] = useState('');
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    const courier = couriers.find((c) => c.id === draft.courier_id);
    if (!draft.destination.trim()) return setError(t('rateForm.errDestination'));
    if (!courier) return setError(t('rateForm.errCourier'));
    if (Number(draft.max_weight_kg) > 0 && Number(draft.max_weight_kg) < Number(draft.min_weight_kg)) {
      return setError(t('rateForm.errWeight'));
    }
    setError('');
    await onSubmit({ ...draft, courier_name: courier.name });
    setDraft({ ...DEFAULTS, courier_id: draft.courier_id, destination: draft.destination });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Plus className="h-4 w-4 text-primary" /> {t('rateForm.title')}
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <select value={draft.destination_type} onChange={(e) => set({ destination_type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="city">{t('rateForm.destCity')}</option>
          <option value="country">{t('rateForm.destCountry')}</option>
          <option value="zone">{t('rateForm.destZone')}</option>
        </select>
        <input
          value={draft.destination}
          onChange={(e) => set({ destination: e.target.value })}
          list="rate-destinations"
          placeholder={t('rateForm.destPh')}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <datalist id="rate-destinations">
          {destinations.map((d) => <option key={d} value={d} />)}
        </datalist>
        <select value={draft.courier_id} onChange={(e) => set({ courier_id: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="">{t('rateForm.carrierPh')}</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {FIELDS.map((f) => (
          <label key={f.field} className="text-[11px] text-muted-foreground">
            {f.label}
            <input
              type="number"
              step={f.step}
              value={draft[f.field]}
              onChange={(e) => set({ [f.field]: e.target.value })}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        ))}
        <label className="text-[11px] text-muted-foreground">
          {t('rateForm.etaLabel')}
          <input value={draft.eta_days} onChange={(e) => set({ eta_days: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          {t('rateForm.priorityLabel')}
          <input type="number" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 md:w-auto md:px-6"
      >
        <Plus className="h-4 w-4" /> {busy ? t('rateForm.adding') : t('rateForm.add')}
      </button>
    </form>
  );
}
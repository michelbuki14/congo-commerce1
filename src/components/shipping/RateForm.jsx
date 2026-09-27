import React, { useState } from 'react';
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

const FIELDS = [
  { field: 'base_usd', label: 'Prise en charge USD', step: '0.1' },
  { field: 'per_kg_usd', label: 'Par kg USD', step: '0.1' },
  { field: 'surcharge_usd', label: 'Supplément USD', step: '0.1' },
  { field: 'min_weight_kg', label: 'Poids min (kg)', step: '0.1' },
  { field: 'max_weight_kg', label: 'Poids max (kg)', step: '0.1' },
  { field: 'max_dimension_cm', label: 'Côté max (cm, 0 = libre)', step: '1' },
];

/** Adds one row to the shipping rate table. */
export default function RateForm({ couriers = [], destinations = [], onSubmit, busy }) {
  const [draft, setDraft] = useState({ ...DEFAULTS, courier_id: couriers[0]?.id || '', destination: destinations[0] || '' });
  const [error, setError] = useState('');
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    const courier = couriers.find((c) => c.id === draft.courier_id);
    if (!draft.destination.trim()) return setError('Indiquez la destination.');
    if (!courier) return setError('Choisissez un transporteur.');
    if (Number(draft.max_weight_kg) > 0 && Number(draft.max_weight_kg) < Number(draft.min_weight_kg)) {
      return setError('Le poids maximum doit être supérieur au minimum.');
    }
    setError('');
    await onSubmit({ ...draft, courier_name: courier.name });
    setDraft({ ...DEFAULTS, courier_id: draft.courier_id, destination: draft.destination });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Plus className="h-4 w-4 text-primary" /> Nouvelle ligne tarifaire
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <select value={draft.destination_type} onChange={(e) => set({ destination_type: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="city">Ville</option>
          <option value="country">Pays</option>
          <option value="zone">Zone régionale</option>
        </select>
        <input
          value={draft.destination}
          onChange={(e) => set({ destination: e.target.value })}
          list="rate-destinations"
          placeholder="Destination (ex : Kinshasa)"
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <datalist id="rate-destinations">
          {destinations.map((d) => <option key={d} value={d} />)}
        </datalist>
        <select value={draft.courier_id} onChange={(e) => set({ courier_id: e.target.value })} className="h-11 rounded-lg border border-border bg-background px-3 text-sm">
          <option value="">Transporteur…</option>
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
          Délai annoncé (ex : 2-4)
          <input value={draft.eta_days} onChange={(e) => set({ eta_days: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Priorité (plus haut = plus spécifique)
          <input type="number" value={draft.priority} onChange={(e) => set({ priority: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 md:w-auto md:px-6"
      >
        <Plus className="h-4 w-4" /> {busy ? 'Ajout…' : 'Ajouter la ligne'}
      </button>
    </form>
  );
}
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function feedHealth(s) {
  if (!s.enabled) return ['Désactivé', 'bg-slate-200 text-slate-700'];
  if (!s.last_sync_at) return ['Jamais synchronisé', 'bg-amber-100 text-amber-900'];
  const h = (Date.now() - new Date(s.last_sync_at)) / 36e5;
  if (h < 24) return ['Sain', 'bg-emerald-100 text-emerald-900'];
  if (h < 72) return ['En retard', 'bg-amber-100 text-amber-900'];
  return ['Flux inactif', 'bg-red-100 text-red-900'];
}

export default function SupplierHealthCard({ supplier: s, check, checking, onCheck, onToggle }) {
  const [label, cls] = feedHealth(s);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{s.name} <span className="text-[11px] font-normal text-muted-foreground">{s.code} · {s.country}</span></p>
          <p className="text-[11px] text-muted-foreground">{s.type === 'local_warehouse' ? 'Entrepôt local' : 'International'} · connecteur {s.adapter}{s.is_mock ? ' (catalogue de démonstration)' : ''}</p>
        </div>
        <Switch checked={s.enabled} onCheckedChange={onToggle} aria-label="Activer" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${cls}`}>{label}</span>
        <span>{s.last_sync_at ? `Dernière synchro ${new Date(s.last_sync_at).toLocaleString('fr-FR')}` : 'Aucune synchro'}</span>
        <span>· {s.avg_shipping_days} j de transit · marge {s.default_markup_percent} %</span>
      </div>
      {check && (
        <ul className="mt-3 space-y-0.5 text-[11px]">
          {check.map(([ok, text]) => <li key={text} className={ok ? 'text-emerald-700' : 'text-destructive'}>{ok ? '✓' : '✗'} {text}</li>)}
        </ul>
      )}
      <Button size="sm" variant="outline" className="mt-3" onClick={onCheck} disabled={checking}>{checking ? 'Vérification…' : 'Vérifier la connexion'}</Button>
    </div>
  );
}
import React from 'react';

/** Per-courier delivery performance against the delay each partner promises. */
export default function CourierPerformanceTable({ rows }) {
  if (!rows?.length) {
    return <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune livraison enregistrée pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 font-semibold">Partenaire</th>
            <th className="px-4 py-2 font-semibold">Livrées</th>
            <th className="px-4 py-2 font-semibold">Délai moyen</th>
            <th className="px-4 py-2 font-semibold">Promis</th>
            <th className="px-4 py-2 font-semibold">Écart</th>
            <th className="px-4 py-2 font-semibold">En cours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-4 py-2.5 font-semibold">{r.name}</td>
              <td className="px-4 py-2.5">{r.delivered}</td>
              <td className="px-4 py-2.5">{r.avgDays != null ? `${r.avgDays} j` : '—'}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.target != null ? `${r.target} j` : '—'}</td>
              <td className="px-4 py-2.5">
                {r.delta == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${r.onTime ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                    {r.delta > 0 ? `+${r.delta} j` : `${r.delta} j`}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">{r.open}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
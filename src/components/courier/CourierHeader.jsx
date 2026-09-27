import React from 'react';
import { Truck } from 'lucide-react';
import { Image } from '@/components/ui/image';

/**
 * Courier console header: the delivery company the courier works for (logo +
 * name) and the signed-in account, so the identity on screen always matches the
 * deliveries listed below.
 */
export default function CourierHeader({ user, fleets, activeFleet, isAdmin, couriers, onSelectFleet }) {
  const name = user?.full_name || user?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
            {activeFleet?.logo_url ? (
              <Image src={activeFleet.logo_url} alt={activeFleet.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Truck className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{activeFleet?.name || 'Aucune société de livraison'}</p>
            <p className="text-[11px] text-muted-foreground">
              {isAdmin ? 'Société inspectée' : 'Ma société de livraison'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold">{name || 'Compte connecté'}</p>
            {user?.email && <p className="text-[11px] text-muted-foreground">{user.email}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initial}
          </div>
        </div>
      </div>

      {isAdmin ? (
        <label className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Je livre pour
          <select
            value={activeFleet?.id || ''}
            onChange={(e) => onSelectFleet(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
          >
            {couriers.length === 0 && <option value="">Aucun transporteur</option>}
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      ) : (
        fleets.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">Mes flottes :</span>
            {fleets.map((f) => (
              <span key={f.id} className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                {f.logo_url && <Image src={f.logo_url} alt={f.name} className="h-4 w-4 rounded-full object-cover" />}
                {f.name}
              </span>
            ))}
          </div>
        )
      )}
    </section>
  );
}
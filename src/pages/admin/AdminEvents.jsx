import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import EventCard from '@/components/admin/EventCard';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { EVENT_CATEGORIES } from '@/lib/events';

export default function AdminEvents() {
  const { t } = useTranslation();
  const FILTERS = [{ id: 'all', label: t('adminEvents.all') }, ...Object.entries(EVENT_CATEGORIES).map(([id, label]) => ({ id, label }))];
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    base44.entities.PlatformEvent.list('-created_date', 150)
      .then((rows) => {
        if (alive) setEvents(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    const unsubscribe = base44.entities.PlatformEvent.subscribe((event) => {
      if (event.type === 'create') setEvents((prev) => [event.data, ...prev]);
      if (event.type === 'update') setEvents((prev) => prev.map((e) => (e.id === event.data.id ? event.data : e)));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const counts = useMemo(
    () =>
      events.reduce(
        (acc, e) => ({
          ...acc,
          [e.category]: (acc[e.category] || 0) + 1,
        }),
        {},
      ),
    [events],
  );

  const attention = useMemo(
    () => events.filter((e) => e.status === 'failed' || e.severity !== 'info').length,
    [events],
  );

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.category === filter)),
    [events, filter],
  );

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title={t('adminEvents.title')} links={ADMIN_LINKS} />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" /> {t('adminEvents.tracked')}
          </p>
          <p className="mt-1 text-2xl font-black">{events.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> {t('adminEvents.watch')}
          </p>
          <p className="mt-1 text-2xl font-black">{attention}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('adminEvents.autoHandled')}
          </p>
          <p className="mt-1 text-2xl font-black">{events.filter((e) => e.status === 'handled').length}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}
          >
            {f.label} ({f.id === 'all' ? events.length : counts[f.id] || 0})
          </button>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-emerald-600" /> {t('adminEvents.liveNote')}
      </p>

      <div className="space-y-2.5">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {!visible.length && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            {t('adminEvents.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
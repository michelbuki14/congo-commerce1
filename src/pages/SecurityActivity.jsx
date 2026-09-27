import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OpsHeader from '@/components/ops/OpsHeader';
import StatCard from '@/components/ops/StatCard';
import { Input } from '@/components/ui/input';

/**
 * What the application itself records as sensitive activity. Sign-in attempts
 * and password changes are handled by the platform's authentication service and
 * are not stored in the app's own audit trail — administrators review them in
 * the platform's authentication settings.
 */
const CATEGORIES = [
  { id: 'all', label: 'Tout', test: () => true },
  { id: 'security', label: 'Sécurité & accès', test: (a) => /auth|login|password|session|security|refus/i.test(a) },
  { id: 'privacy', label: 'Données personnelles', test: (a) => /privacy|data_|gdpr|request/i.test(a) },
  { id: 'finance', label: 'Finance', test: (a) => /wallet|payment|payout|refund|billing|invoice|coupon/i.test(a) },
  { id: 'admin', label: 'Administration', test: (a) => /admin|setting|role|user|compliance/i.test(a) },
  { id: 'automation', label: 'Automatisations', test: (a) => /workflow|analytics|logistics|seller\.|fulfillment/i.test(a) },
];

const SEVERITY_TONE = {
  info: 'bg-secondary text-muted-foreground',
  warning: 'bg-amber-100 text-amber-900',
  critical: 'bg-red-100 text-red-900',
};

export default function SecurityActivity() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');

  const isAdmin = String(user?.role || '') === 'admin';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    base44.entities.AuditLog.list('-created_date', 200)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const needle = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (!cat.test(String(l.action || ''))) return false;
      if (severity !== 'all' && String(l.severity || 'info') !== severity) return false;
      if (!needle) return true;
      return [l.action, l.actor, l.reference, l.entity, JSON.stringify(l.details || {})]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [logs, category, severity, query]);

  if (!user) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  if (!isAdmin) {
    return (
      <div className="space-y-5 pb-8">
        <OpsHeader
          title="Activité de sécurité"
          subtitle="Votre compte et les actions sensibles qui y sont rattachées."
        />
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" /> Votre compte</h2>
          <dl className="mt-2.5 grid gap-2 text-xs md:grid-cols-2">
            <div><dt className="text-muted-foreground">Adresse</dt><dd className="font-semibold">{user.email}</dd></div>
            <div><dt className="text-muted-foreground">Rôle</dt><dd className="font-semibold">{user.role || 'utilisateur'}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4" /> Mot de passe et connexion</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Vos tentatives de connexion et changements de mot de passe sont gérés par le service d'authentification de la
            plateforme et ne sont pas conservés dans l'application. Un administrateur peut les consulter depuis les
            paramètres d'authentification de la plateforme.
          </p>
          <a
            href="/forgot-password"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" /> Changer mon mot de passe
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Activité de sécurité"
        subtitle="Actions sensibles enregistrées par l'application : accès refusés, demandes de données, mouvements financiers et opérations d'administration."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Entrées chargées" value={logs.length} hint="200 plus récentes" />
        <StatCard label="Critiques" value={logs.filter((l) => l.severity === 'critical').length} tone={logs.some((l) => l.severity === 'critical') ? 'bad' : 'default'} />
        <StatCard label="Avertissements" value={logs.filter((l) => l.severity === 'warning').length} tone={logs.some((l) => l.severity === 'warning') ? 'warn' : 'default'} />
        <StatCard label="Accès refusés" value={logs.filter((l) => /refus|unauthor|interdit/i.test(String(l.action || ''))).length} hint="appels non autorisés bloqués" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${category === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {c.label}
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une action, un acteur…" className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'info', 'warning', 'critical'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${severity === s ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {s === 'all' ? 'Toutes gravités' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {visible.length ? visible.map((l) => (
              <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                    {l.action}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(l.created_date).toLocaleString('fr-FR')} · {l.actor || 'système'}
                    {l.entity ? ` · ${l.entity}` : ''}{l.reference ? ` · ${l.reference}` : ''}
                  </p>
                  {l.details && Object.keys(l.details).length ? (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {Object.entries(l.details).map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SEVERITY_TONE[l.severity] || SEVERITY_TONE.info}`}>
                  {l.severity || 'info'}
                </span>
              </div>
            )) : (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Aucune entrée pour ce filtre.</p>
            )}
          </div>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground">
        Les tentatives de connexion et changements de mot de passe sont gérés par le service d'authentification de la
        plateforme et ne figurent pas dans ce journal.
      </p>
    </div>
  );
}
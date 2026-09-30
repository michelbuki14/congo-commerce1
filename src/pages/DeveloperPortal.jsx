import React, { useState } from 'react';
import { Code2, Plus, Trash2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { DEV_SECTIONS } from '@/lib/devDocs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

const API_KEY_SCOPES = [
  'orders.read',
  'orders.write',
  'products.read',
  'products.write',
  'shipments.read',
  'shipments.write',
];

const ALL_TABS = [
  ...DEV_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
  { id: 'api-keys', title: 'Clés API' },
];

export default function DeveloperPortal() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(DEV_SECTIONS[0].id);
  const section = DEV_SECTIONS.find((s) => s.id === tab);

  if (tab === 'api-keys') {
    return <ApiKeysTab tab={tab} setTab={setTab} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Code2 className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold">{t('developerPortal.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('developerPortal.subtitle')}</p>
        </div>
      </div>
      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3">
        {ALL_TABS.map((s) => (
          <button key={s.id} type="button" onClick={() => setTab(s.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{s.title}</button>
        ))}
      </nav>
      <div className="space-y-3">
        {section.blocks.map((b) => (
          <section key={b.h} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">{b.h}</h2>
            {b.p && <p className="mt-1 text-sm text-muted-foreground">{b.p}</p>}
            {b.code && <pre className="mt-2 overflow-x-auto rounded-xl bg-primary p-3 font-mono text-xs text-primary-foreground">{b.code}</pre>}
          </section>
        ))}
      </div>
    </div>
  );
}

function ApiKeysTab({ tab, setTab }) {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [newKey, setNewKey] = useState({
    name: '',
    tenant_id: '',
    scopes: [],
    rate_limit_rph: 300,
    expires_at: '',
  });

  const loadKeys = async () => {
    setLoading(true);
    try {
      const keys = await base44.functions.invoke('manage-api-keys', { method: 'GET' });
      setApiKeys(keys);
    } catch {
      setApiKeys([]);
    }
    setLoading(false);
  };

  useState(() => {
    loadKeys();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const result = await base44.functions.invoke('manage-api-keys', {
      method: 'POST',
      body: newKey,
    });
    setGeneratedKey(result.api_key);
    setCreating(false);
    loadKeys();
  };

  const handleRevoke = async (id) => {
    await base44.functions.invoke('manage-api-keys', {
      method: 'DELETE',
      body: { id },
    });
    loadKeys();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleScope = (scope) => {
    setNewKey((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Code2 className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold">{t('developerPortal.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('developerPortal.subtitle')}</p>
        </div>
      </div>
      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3">
        {ALL_TABS.map((s) => (
          <button key={s.id} type="button" onClick={() => setTab(s.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{s.title}</button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Gérer les clés API</h2>
            <Button onClick={() => setCreating(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Créer
            </Button>
          </div>

          {generatedKey && (
            <div className="mb-4 rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Clé générée (copiez-la maintenant, elle ne sera plus affichée)</span>
                <button onClick={() => setGeneratedKey(null)} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-xs">{generatedKey}</code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {creating && (
            <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-border p-4">
              <div>
                <label className="mb-1 block text-xs font-medium">Nom</label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Mon intégration"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Tenant ID</label>
                <input
                  type="text"
                  value={newKey.tenant_id}
                  onChange={(e) => setNewKey({ ...newKey, tenant_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="tenant_xxx"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {API_KEY_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={newKey.scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="h-3.5 w-3.5"
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Limite de débit (requêtes / heure)</label>
                <input
                  type="number"
                  value={newKey.rate_limit_rph}
                  onChange={(e) => setNewKey({ ...newKey, rate_limit_rph: parseInt(e.target.value) || 300 })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  min="1"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Date d'expiration (optionnel)</label>
                <input
                  type="date"
                  value={newKey.expires_at}
                  onChange={(e) => setNewKey({ ...newKey, expires_at: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Créer la clé</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>Annuler</Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-secondary" />
          ) : apiKeys.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune clé API pour le moment</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{key.name}</span>
                      {!key.active && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Révoqué</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">{key.key_prefix}…</span>
                      {key.tenant_name && <span>{key.tenant_name}</span>}
                      <span>{key.scopes?.join(', ')}</span>
                      <span>{key.rate_limit_rph} req/h</span>
                      {key.last_used_at && <span>Dernière utilisation : {formatDate(key.last_used_at)}</span>}
                      {key.expires_at && <span>Expire : {formatDate(key.expires_at)}</span>}
                    </div>
                  </div>
                  {key.active && (
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Check, Copy, KeyRound, Link2, Save, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OpsHeader from '@/components/ops/OpsHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', model: 'gpt-5-mini' },
  { id: 'anthropic', label: 'Anthropic', model: 'claude-sonnet-5' },
  { id: 'google', label: 'Google', model: 'gemini-3-flash' },
  { id: 'custom', label: 'Passerelle interne', model: '' },
];

const settingKey = (email) => `partner_ai:${String(email || '').toLowerCase()}`;

const DEFAULT = {
  provider: 'openai',
  model: 'gpt-5-mini',
  base_url: '',
  assistant_id: 'shopping_assistant',
  key_hint: '',
  allow_mcp: true,
  read_only: true,
};

export default function PartnerAiSettings() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [settingId, setSettingId] = useState('');
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [settings, owned] = await Promise.all([
        base44.entities.PlatformSetting.filter({ key: settingKey(user.email) }).catch(() => []),
        base44.entities.Tenant.filter({ owner_email: user.email }).catch(() => []),
      ]);
      setTenants(owned);
      if (settings[0]) {
        setSettingId(settings[0].id);
        setForm({ ...DEFAULT, ...(settings[0].value || {}) });
      }
    })().finally(() => setLoading(false));
  }, [user]);

  const endpoint = useMemo(
    () => (typeof window === 'undefined' ? '' : `${window.location.origin}/functions/`),
    [],
  );

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setNotice('');
    try {
      const value = {
        ...form,
        model: form.model.trim(),
        base_url: form.base_url.trim(),
        assistant_id: form.assistant_id.trim(),
        key_hint: form.key_hint.trim(),
        updated_at: new Date().toISOString(),
        updated_by: user.email,
      };
      if (settingId) {
        await base44.entities.PlatformSetting.update(settingId, { value });
      } else {
        const created = await base44.entities.PlatformSetting.create({
          key: settingKey(user.email),
          label: 'Connexion assistant IA',
          group: 'integrations',
          value,
        });
        setSettingId(created.id);
      }
      setForm(value);
      setNotice('Configuration enregistrée.');
    } catch (e) {
      setNotice(e?.message || "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <OpsHeader
        title="Connexion assistant IA"
        subtitle="Réglages de connexion des assistants externes (ChatGPT, Claude, votre passerelle interne) à votre espace partenaire."
      />

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4" /> Fournisseur et modèle</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="ai-provider" className="text-[11px]">Fournisseur</Label>
            <select
              id="ai-provider"
              value={form.provider}
              onChange={(e) => {
                const provider = PROVIDERS.find((p) => p.id === e.target.value) || PROVIDERS[0];
                setForm({ ...form, provider: provider.id, model: provider.model || form.model });
              }}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="ai-model" className="text-[11px]">Modèle</Label>
            <Input id="ai-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="claude-sonnet-5" />
          </div>
          <div>
            <Label htmlFor="ai-assistant" className="text-[11px]">Assistant lié</Label>
            <Input id="ai-assistant" value={form.assistant_id} onChange={(e) => setForm({ ...form, assistant_id: e.target.value })} placeholder="shopping_assistant" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ai-base" className="text-[11px]">URL de base (passerelle interne)</Label>
            <Input id="ai-base" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://ia.votre-entreprise.cd/v1" />
          </div>
          <div>
            <Label htmlFor="ai-hint" className="text-[11px]">4 derniers caractères de la clé</Label>
            <Input
              id="ai-hint"
              value={form.key_hint}
              maxLength={4}
              onChange={(e) => setForm({ ...form, key_hint: e.target.value })}
              placeholder="a1b2"
            />
          </div>
        </div>

        <div className="mt-3 space-y-2.5 rounded-xl bg-secondary/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Autoriser l'accès via MCP</p>
              <p className="text-[11px] text-muted-foreground">Les assistants autorisés peuvent lire votre catalogue et vos commandes.</p>
            </div>
            <Switch checked={form.allow_mcp} onCheckedChange={(v) => setForm({ ...form, allow_mcp: v })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Mode lecture seule</p>
              <p className="text-[11px] text-muted-foreground">Interdit toute écriture depuis un assistant externe.</p>
            </div>
            <Switch checked={form.read_only} onCheckedChange={(v) => setForm({ ...form, read_only: v })} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </button>
          {notice ? <span className="text-[11px] text-muted-foreground">{notice}</span> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" /> Où placer la clé d'API</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          La clé complète n'est jamais enregistrée dans l'application : elle se place dans le coffre de secrets de la
          plateforme (tableau de bord → Secrets), où elle n'est lisible par personne. Seuls les quatre derniers
          caractères sont conservés ici, pour vérifier quelle clé est active.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Une fois la clé en place, autorisez l'accès depuis le tableau de bord → MCP, puis connectez votre assistant en
          lui indiquant l'adresse ci-dessous.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Link2 className="h-4 w-4" /> Adresses de connexion</h2>
        <div className="mt-3 space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Base des fonctions</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-[11px]">{endpoint}</code>
              <button
                type="button"
                onClick={() => copy('endpoint', endpoint)}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
              >
                {copied === 'endpoint' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copier
              </button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assistant lié</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-[11px]">{form.assistant_id || 'shopping_assistant'}</code>
              <button
                type="button"
                onClick={() => copy('assistant', form.assistant_id || 'shopping_assistant')}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold"
              >
                {copied === 'assistant' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copier
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4" /> Espaces partenaire rattachés</h2>
        {tenants.length ? (
          <div className="mt-2.5 space-y-1.5">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted-foreground">{t.subdomain || t.slug} · plan {t.plan_code || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aucun espace partenaire n'est rattaché à votre compte. Créez-en un depuis « Enseigne » pour lier un
            assistant à votre catalogue.
          </p>
        )}
      </section>
    </div>
  );
}
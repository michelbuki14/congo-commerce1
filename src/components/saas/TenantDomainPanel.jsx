import React, { useState } from 'react';
import { Globe, ShieldCheck, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { useTranslation } from 'react-i18next';

function token() {
  return `cc-verify-${Math.random().toString(36).slice(2, 12)}`;
}

export default function TenantDomainPanel({ tenant, domains, onChange }) {
  const { t } = useTranslation();
  const STATUS_LABELS = {
    pending: t('tenantDomainPanel.statusPending'),
    dns_pending: t('tenantDomainPanel.statusDns'),
    verified: t('tenantDomainPanel.statusVerified'),
    failed: t('tenantDomainPanel.statusFailed'),
  };
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const subdomainHost = tenant?.slug ? `${tenant.slug}.congocommerce.app` : '';

  const add = async (value, type) => {
    const host = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!host) return;
    setBusy(true);
    setError('');
    try {
      await base44.entities.TenantDomain.create({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        owner_email: tenant.owner_email || '',
        hostname: host,
        type,
        status: type === 'subdomain' ? 'verified' : 'dns_pending',
        verification_token: token(),
        ssl_status: type === 'subdomain' ? 'active' : 'pending',
        is_primary: domains.length === 0,
      });
      setHostname('');
      onChange();
    } catch (e) {
      setError(e?.message || t('tenantDomainPanel.addFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    await base44.entities.TenantDomain.delete(row.id);
    onChange();
  };

  const setPrimary = async (row) => {
    await Promise.all(domains.map((d) => base44.entities.TenantDomain.update(d.id, { is_primary: d.id === row.id })));
    onChange();
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-heading text-base font-bold">{t('tenantDomainPanel.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('tenantDomainPanel.subtitle')}
          </p>
        </div>

        <div className="space-y-2">
          {domains.length === 0 && <p className="text-sm text-muted-foreground">{t('tenantDomainPanel.empty')}</p>}
          {domains.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4" /> {d.hostname}
                  {d.is_primary && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t('tenantDomainPanel.primary')}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('tenantDomainPanel.rowMeta', { type: d.type === 'subdomain' ? t('tenantDomainPanel.subdomain') : t('tenantDomainPanel.custom'), status: STATUS_LABELS[d.status] || d.status })}
                  {d.status === 'verified' ? t('tenantDomainPanel.sslMeta', { ssl: d.ssl_status === 'active' ? t('tenantDomainPanel.sslActive') : t('tenantDomainPanel.sslPending'), date: formatDate(d.verified_at) }) : ''}
                </p>
                {d.type === 'custom' && d.status !== 'verified' && (
                  <p className="mt-1 rounded-lg bg-secondary p-2 font-mono text-[11px]">
                    TXT _congocommerce.{d.hostname} = {d.verification_token}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!d.is_primary && (
                  <Button variant="outline" size="sm" onClick={() => setPrimary(d)}>{t('tenantDomainPanel.setPrimary')}</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => remove(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <label className="text-sm font-medium" htmlFor="d-host">{t('tenantDomainPanel.addLabel')}</label>
            <Input id="d-host" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="boutique.mondomaine.cd" />
          </div>
          <Button onClick={() => add(hostname, 'custom')} disabled={busy || !hostname}>{t('tenantDomainPanel.add')}</Button>
          {subdomainHost && (
            <Button variant="outline" onClick={() => add(subdomainHost, 'subdomain')} disabled={busy}>
              {t('tenantDomainPanel.use', { host: subdomainHost })}
            </Button>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {t('tenantDomainPanel.dnsNote')}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
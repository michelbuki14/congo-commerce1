import React, { memo, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TENANT_PERMISSIONS, TENANT_ROLES, permissionLabel, permissionsForRole } from '@/lib/permissions';
import { formatDate } from '@/lib/format';
import { useTranslation } from 'react-i18next';

export default memo(function TenantTeamPanel({ tenant, members, onChange, permissions = [], owner = false }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('SUPPORT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allowedRoles = TENANT_ROLES.filter(r => owner || (r.id !== 'TENANT_ADMIN' && permissionsForRole(r.id).every(p => permissions.includes(p))));
  const invite = async () => {
    if (!email) return;
    setBusy(true);
    setError('');
    try {
      await base44.functions.invoke('manageTenantTeam', { action: 'invite', tenantId: tenant.id, email, name, role });
      setEmail('');
      setName('');
      await onChange();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('tenantTeamPanel.inviteFailed'));
    } finally {
      setBusy(false);
    }
  };

  const manage = async (action, member, values = {}) => {
    setBusy(true);
    setError('');
    try {
      await base44.functions.invoke('manageTenantTeam', { action, tenantId: tenant.id, memberId: member.id, ...values });
      await onChange();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Action refusée');
    } finally {
      setBusy(false);
    }
  };
  const changeRole = (member, nextRole) => manage('role', member, { role: nextRole });
  const togglePermission = (member, key) => {
    const current = member.permissions || [];
    manage('permissions', member, { permissions: current.includes(key) ? current.filter(k => k !== key) : [...current, key] });
  };
  const remove = (member) => manage('remove', member);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-heading text-base font-bold">{t('tenantTeamPanel.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('tenantTeamPanel.subtitle')}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto_auto]">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="membre@exemple.cd" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tenantTeamPanel.namePlaceholder')} />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {allowedRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <Button onClick={invite} disabled={busy || !email || !allowedRoles.some(r => r.id === role)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> {t('tenantTeamPanel.invite')}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {members.length === 0 && <p className="text-sm text-muted-foreground">{t('tenantTeamPanel.empty')}</p>}
          {members.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{m.full_name || m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('tenantTeamPanel.memberMeta', { email: m.email, status: m.status === 'active' ? t('tenantTeamPanel.active') : t('tenantTeamPanel.invited'), date: formatDate(m.created_date) })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value)}
                    disabled={busy || m.email === tenant.owner_email || (!owner && m.role === 'TENANT_ADMIN')}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {allowedRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" disabled={busy || m.email === tenant.owner_email || (!owner && m.role === 'TENANT_ADMIN')} aria-label={`Retirer ${m.email}`} onClick={() => remove(m)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TENANT_PERMISSIONS.map((p) => {
                  const on = (m.permissions || []).includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePermission(m, p.key)}
                      disabled={busy || m.email === tenant.owner_email || (!owner && (!permissions.includes(p.key) || m.role === 'TENANT_ADMIN'))}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
                    >
                      {permissionLabel(p.key)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
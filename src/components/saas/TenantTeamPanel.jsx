import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TENANT_PERMISSIONS, TENANT_ROLES, permissionLabel, permissionsForRole } from '@/lib/permissions';
import { formatDate } from '@/lib/format';

export default function TenantTeamPanel({ tenant, members, onChange }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('SUPPORT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const invite = async () => {
    if (!email) return;
    setBusy(true);
    setError('');
    try {
      await base44.entities.TenantMember.create({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        owner_email: tenant.owner_email || '',
        email: String(email).trim().toLowerCase(),
        full_name: name,
        role,
        permissions: permissionsForRole(role),
        status: 'invited',
        invited_by: tenant.owner_email || '',
      });
      setEmail('');
      setName('');
      onChange();
    } catch (e) {
      setError(e?.message || 'Invitation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member, nextRole) => {
    await base44.entities.TenantMember.update(member.id, { role: nextRole, permissions: permissionsForRole(nextRole) });
    onChange();
  };

  const togglePermission = async (member, key) => {
    const current = member.permissions || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    await base44.entities.TenantMember.update(member.id, { permissions: next });
    onChange();
  };

  const remove = async (member) => {
    await base44.entities.TenantMember.delete(member.id);
    onChange();
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-heading text-base font-bold">Équipe & rôles</h2>
          <p className="text-sm text-muted-foreground">Chaque membre reçoit les permissions de son rôle, ajustables une par une.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto_auto]">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="membre@exemple.cd" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {TENANT_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <Button onClick={invite} disabled={busy || !email}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Inviter
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {members.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>}
          {members.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{m.full_name || m.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · {m.status === 'active' ? 'actif' : 'invité'} · {formatDate(m.created_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {TENANT_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => remove(m)}>
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
}
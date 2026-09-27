import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/tenancy';

const EMPTY = {
  name: '',
  slug: '',
  owner_name: '',
  owner_email: '',
  phone: '',
  city: 'Kinshasa',
  country: 'CD',
  currency: 'USD',
  default_language: 'fr',
  logo_url: '',
  primary_color: '#0A0A0A',
  accent_color: '#E4572E',
  email_from_name: '',
  commission_rate: 12,
  vat_rate: 16,
};

export default function TenantForm({ initial, onSubmit, submitting = false, submitLabel = 'Enregistrer' }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [slugLocked, setSlugLocked] = useState(Boolean(initial?.slug));

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setName = (value) => {
    setForm((f) => ({ ...f, name: value, slug: slugLocked ? f.slug : slugify(value) }));
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      slug: slugify(form.slug || form.name),
      commission_rate: Number(form.commission_rate) || 0,
      vat_rate: Number(form.vat_rate) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="t-name">Nom de l’enseigne</Label>
          <Input id="t-name" value={form.name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Kin Fashion" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-slug">Identifiant (URL)</Label>
          <Input
            id="t-slug"
            value={form.slug}
            onChange={(e) => { setSlugLocked(true); set('slug', slugify(e.target.value)); }}
            placeholder="kin-fashion"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-city">Ville</Label>
          <Input id="t-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-owner">Responsable</Label>
          <Input id="t-owner" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="Nom complet" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-email">E-mail du compte</Label>
          <Input id="t-email" type="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} placeholder="vous@exemple.cd" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-phone">Téléphone</Label>
          <Input id="t-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+243 …" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-currency">Devise d’affichage</Label>
          <select
            id="t-currency"
            value={form.currency}
            onChange={(e) => set('currency', e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="USD">USD — dollar</option>
            <option value="CDF">CDF — franc congolais</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="t-primary">Couleur principale</Label>
          <input
            id="t-primary"
            type="color"
            value={form.primary_color}
            onChange={(e) => set('primary_color', e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-input bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-accent">Couleur secondaire</Label>
          <input
            id="t-accent"
            type="color"
            value={form.accent_color}
            onChange={(e) => set('accent_color', e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-input bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-logo">Logo (URL)</Label>
          <Input id="t-logo" value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="t-commission">Commission plateforme (%)</Label>
          <Input id="t-commission" type="number" min="0" max="50" step="0.5" value={form.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-vat">TVA appliquée (%)</Label>
          <Input id="t-vat" type="number" min="0" max="30" step="0.5" value={form.vat_rate} onChange={(e) => set('vat_rate', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-from">Nom d’expéditeur des e-mails</Label>
          <Input id="t-from" value={form.email_from_name} onChange={(e) => set('email_from_name', e.target.value)} placeholder="Kin Fashion" />
        </div>
      </div>

      <Button type="submit" disabled={submitting || !form.name}>
        {submitting ? 'Enregistrement…' : submitLabel}
      </Button>
    </form>
  );
}
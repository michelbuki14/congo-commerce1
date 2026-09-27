import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function CategoryForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ name: '', slug: '', description: '', image_url: '', ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === 'name' && !initial?.id ? { slug: slugify(e.target.value) } : {}) });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name: f.name, slug: slugify(f.slug || f.name), description: f.description, image_url: f.image_url });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <Input placeholder="Nom de la catégorie" value={f.name} onChange={set('name')} />
      <Input placeholder="Adresse (slug)" value={f.slug} onChange={set('slug')} />
      <Input placeholder="Description" value={f.description || ''} onChange={set('description')} />
      <Input placeholder="Lien de l'image" value={f.image_url || ''} onChange={set('image_url')} />
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={!f.name || saving}>{saving ? 'Enregistrement…' : initial?.id ? 'Enregistrer' : 'Créer la catégorie'}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
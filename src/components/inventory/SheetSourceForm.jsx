import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { name: '', url: '', sheet_range: 'A:Z', supplier_id: '' };

function sheetId(v) {
  const m = String(v).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : String(v).trim();
}

export default function SheetSourceForm({ suppliers, onSave }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const sup = suppliers.find((s) => s.id === f.supplier_id);
    await onSave({
      name: f.name, spreadsheet_id: sheetId(f.url), sheet_range: f.sheet_range || 'A:Z',
      supplier_id: f.supplier_id || '', supplier_name: sup?.name || '', active: true, last_status: 'never',
    });
    setF(EMPTY);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <Input placeholder="Nom (ex : Stock fournisseur Shenzhen)" value={f.name} onChange={set('name')} />
      <Input placeholder="Lien ou identifiant de la feuille Google" value={f.url} onChange={set('url')} />
      <Input placeholder="Onglet / plage (ex : Stock!A:C)" value={f.sheet_range} onChange={set('sheet_range')} />
      <select value={f.supplier_id} onChange={set('supplier_id')} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        <option value="">Tous les produits</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <Button type="submit" disabled={!f.name || !f.url || saving} className="md:col-span-2">
        {saving ? 'Ajout…' : 'Ajouter la feuille'}
      </Button>
    </form>
  );
}
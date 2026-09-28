import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMPTY = { name: '', url: '', sheet_range: 'A:Z', supplier_id: '' };

function sheetId(v) {
  const m = String(v).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : String(v).trim();
}

export default function SheetSourceForm({ suppliers, onSave }) {
  const { t } = useTranslation();
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
      <Input placeholder={t('sheetSourceForm.phName')} value={f.name} onChange={set('name')} />
      <Input placeholder={t('sheetSourceForm.phUrl')} value={f.url} onChange={set('url')} />
      <Input placeholder={t('sheetSourceForm.phRange')} value={f.sheet_range} onChange={set('sheet_range')} />
      <select value={f.supplier_id} onChange={set('supplier_id')} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        <option value="">{t('sheetSourceForm.allProducts')}</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <Button type="submit" disabled={!f.name || !f.url || saving} className="md:col-span-2">
        {saving ? t('sheetSourceForm.adding') : t('sheetSourceForm.add')}
      </Button>
    </form>
  );
}
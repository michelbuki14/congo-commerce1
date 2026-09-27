import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import CategoryForm from '@/components/categories/CategoryForm';
import CategoryRow from '@/components/categories/CategoryRow';

export default function CategoryManager() {
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const load = () => base44.entities.Category.list('sort_order', 500).then(setCats);
  useEffect(() => { load(); }, []);

  const save = async (data) => {
    setError('');
    const clash = cats.find((c) => c.slug === data.slug && c.id !== editing?.id);
    if (clash) { setError(`L'adresse « ${data.slug} » est déjà utilisée.`); return; }
    if (editing) await base44.entities.Category.update(editing.id, data);
    else await base44.entities.Category.create({ ...data, active: true, sort_order: cats.length });
    setEditing(null);
    await load();
  };

  const move = async (i, dir) => {
    const list = [...cats];
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    setCats(list);
    await base44.entities.Category.bulkUpdate(list.map((c, idx) => ({ id: c.id, sort_order: idx })));
  };

  const remove = async (c) => {
    const used = await base44.entities.Product.filter({ category_id: c.id }, '-created_date', 1);
    if (used.length) { setError(`« ${c.name} » contient des produits : masquez-la plutôt que de la supprimer.`); return; }
    if (!window.confirm(`Supprimer « ${c.name} » ?`)) return;
    await base44.entities.Category.delete(c.id);
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5">
      <DashboardNav title="Catégories" links={ADMIN_LINKS} />
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-bold">{editing ? `Modifier « ${editing.name} »` : 'Nouvelle catégorie'}</p>
        <CategoryForm key={editing?.id || 'new'} initial={editing} onSave={save} onCancel={editing ? () => setEditing(null) : null} />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      {!cats ? <div className="h-40 animate-pulse rounded-2xl bg-secondary" /> : cats.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune catégorie pour l'instant.</p>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {cats.map((c, i) => (
            <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === cats.length - 1}
              onMove={(d) => move(i, d)} onEdit={() => setEditing(c)} onDelete={() => remove(c)}
              onToggle={async (on) => { await base44.entities.Category.update(c.id, { active: on }); load(); }} />
          ))}
        </div>
      )}
    </div>
  );
}
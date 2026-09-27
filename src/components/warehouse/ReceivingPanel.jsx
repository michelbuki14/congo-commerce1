import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';

export default function ReceivingPanel() {
  const [products, setProducts] = useState([]);
  const [moves, setMoves] = useState([]);
  const [form, setForm] = useState({ product_id: '', quantity: 1, location: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Product.list('title', 500).then(setProducts);
    base44.entities.StockMovement.list('-created_date', 30).then(setMoves);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const p = products.find((x) => x.id === form.product_id);
    const qty = Number(form.quantity);
    if (!p || !qty) return;
    setSaving(true);
    const stock = (Number(p.stock) || 0) + qty;
    await base44.entities.Product.update(p.id, { stock });
    const m = await base44.entities.StockMovement.create({ product_id: p.id, product_title: p.title, type: qty > 0 ? 'receipt' : 'adjustment', quantity: qty, stock_after: stock, location: form.location, note: form.note });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock } : x)));
    setMoves((prev) => [m, ...prev]);
    setForm({ product_id: '', quantity: 1, location: '', note: '' });
    setSaving(false);
  };

  const field = 'h-10 rounded-xl border border-border bg-background px-3 text-sm';
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-[2fr_100px_1fr_1fr_auto]">
        <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={field}>
          <option value="">Produit…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title} (stock {p.stock ?? 0})</option>)}
        </select>
        <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={field} title="Quantité (négative = ajustement)" />
        <input placeholder="Emplacement (ex. A-03)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={field} />
        <input placeholder="Note / bon de livraison" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={field} />
        <button type="submit" disabled={saving} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Enregistrer</button>
      </form>
      <div className="space-y-1.5">
        <h2 className="text-sm font-bold">Mouvements récents</h2>
        {!moves.length && <p className="text-xs text-muted-foreground">Aucun mouvement enregistré.</p>}
        {moves.map((m) => (
          <div key={m.id} className="flex justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
            <span><b>{m.quantity > 0 ? '+' : ''}{m.quantity}</b> {m.product_title}{m.location ? ` · ${m.location}` : ''}</span>
            <span className="text-muted-foreground">stock {m.stock_after} · {formatDateTime(m.created_date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
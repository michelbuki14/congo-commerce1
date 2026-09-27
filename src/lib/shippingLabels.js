export const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Opens a printable sheet with one shipping label per order. */
export function printShippingLabels(orders, fulfillments = []) {
  const labels = orders.map((o) => {
    const tracking = fulfillments.filter((f) => f.order_id === o.id).map((f) => f.tracking_number).filter(Boolean).join(', ');
    const qty = (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const dest = o.delivery_method === 'pickup_point'
      ? `Point de retrait : ${esc(o.pickup_point_name)}<br/>Code : <b>${esc(o.pickup_code)}</b>`
      : `${esc(o.address)}<br/>${esc(o.city)}`;
    return `<div class="label">
      <div class="head"><b>CONGO COMMERCE</b><span>${esc(o.order_number)}</span></div>
      <p class="to">À : <b>${esc(o.customer_name)}</b><br/>${esc(o.customer_phone)}<br/>${dest}</p>
      <p>${qty} article(s) · ${o.payment_provider === 'cod' && o.payment_status !== 'PAID' ? `<b>À encaisser : $${Number(o.total_usd || 0).toFixed(2)}</b>` : 'Payé'}</p>
      <p class="trk">Suivi : ${esc(tracking || '—')}</p>
    </div>`;
  }).join('');
  const win = window.open('', '_blank');
  if (!win) throw new Error('Autorisez les fenêtres pop-up pour imprimer les étiquettes.');
  win.document.write(`<html><head><title>Étiquettes</title><style>
    body{font-family:sans-serif;margin:0;padding:12px;display:flex;flex-wrap:wrap;gap:12px}
    .label{width:4in;min-height:3in;border:2px solid #000;padding:12px;box-sizing:border-box;page-break-inside:avoid;font-size:13px}
    .head{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:6px}
    .to{font-size:15px}.trk{font-family:monospace}
  </style></head><body>${labels}<script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}
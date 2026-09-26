import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { formatUSD, formatDateTime } from '@/lib/format';
import { getCompanyConfig, getTaxConfig } from '@/lib/config';
import { splitVat, getVatRate } from '@/lib/tax';

export default function Invoice() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setOrder(await base44.entities.Order.get(id));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="mx-auto h-64 w-full max-w-3xl animate-pulse rounded-2xl bg-secondary" />;
  }

  if (notFound || !order) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold">Facture introuvable</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const company = getCompanyConfig();
  const tax = getTaxConfig();
  const rate = Number(order.vat_rate) || getVatRate();
  const fallback = splitVat(order.total_usd, rate);
  const ht = Number(order.total_ht_usd) || fallback.ht;
  const vat = Number(order.vat_usd) || fallback.vat;
  const paid = order.payment_status === 'PAID' || order.payment_status === 'AUTHORIZED';

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to={`/order/${order.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la commande
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      <article className="space-y-5 rounded-2xl border border-border bg-card p-5 md:p-7">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-black">
              <FileText className="h-5 w-5 text-primary" /> FACTURE
            </p>
            <p className="mt-1 text-sm font-bold">{order.invoice_number || '—'}</p>
            <p className="text-[11px] text-muted-foreground">
              Émise le {formatDateTime(order.created_date)}
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <p>Commande {order.order_number}</p>
            <p className="mt-1">
              <StatusBadge status={order.payment_status} />
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Émetteur</h2>
            <p className="mt-1.5 text-sm font-bold">{company.legal_name || 'Congo Commerce'}</p>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              {company.address && <p>{company.address}</p>}
              <p>{[company.city, company.country].filter(Boolean).join(', ')}</p>
              <p>RCCM : {company.rccm || '—'}</p>
              <p>NIF : {company.nif || '—'}</p>
              {company.vat_number && <p>N° TVA : {company.vat_number}</p>}
              {company.phone && <p>Tél. : {company.phone}</p>}
              {company.email && <p>{company.email}</p>}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Client</h2>
            <p className="mt-1.5 text-sm font-bold">{order.customer_name}</p>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              <p>{order.customer_phone}</p>
              {order.customer_email && <p>{order.customer_email}</p>}
              {order.delivery_method === 'pickup_point' ? (
                <p>Retrait — {order.pickup_point_name}</p>
              ) : (
                <p>{[order.address, order.city].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </section>
        </div>

        <section className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">Désignation</th>
                <th className="py-2 px-2 text-right font-semibold">Qté</th>
                <th className="py-2 px-2 text-right font-semibold">P.U. TTC</th>
                <th className="py-2 pl-2 text-right font-semibold">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((it, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2 pr-2">
                    <p className="font-medium text-foreground">{it.title}</p>
                    {it.variant && <p className="text-[11px] text-muted-foreground">{it.variant}</p>}
                  </td>
                  <td className="py-2 px-2 text-right">{it.quantity}</td>
                  <td className="py-2 px-2 text-right">{formatUSD(it.unit_price_usd)}</td>
                  <td className="py-2 pl-2 text-right font-semibold">{formatUSD(it.line_total_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ml-auto w-full space-y-1.5 text-sm md:max-w-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total TTC</span>
            <span>{formatUSD(order.subtotal_usd)}</span>
          </div>
          {Number(order.discount_usd) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Remise {order.coupon_code}</span>
              <span>-{formatUSD(order.discount_usd)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Livraison TTC</span>
            <span>{Number(order.shipping_usd) === 0 ? 'Offerte' : formatUSD(order.shipping_usd)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <span>Total TTC</span>
            <span>{formatUSD(order.total_usd)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total HT</span>
            <span>{formatUSD(ht)}</span>
          </div>
          {rate > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">TVA ({rate} %)</span>
              <span>{formatUSD(vat)}</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Soit environ {Math.round(order.total_cdf || 0).toLocaleString('fr-FR')} FC au taux appliqué.
          </p>
        </section>

        <section className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Règlement :</span> {order.payment_method} —{' '}
            {paid ? 'payé' : 'en attente de paiement'}
          </p>
          <p className="mt-0.5">
            <span className="font-semibold text-foreground">Référence :</span> {order.payment_reference || '—'}
          </p>
          {tax.invoice_note && <p className="mt-1.5">{tax.invoice_note}</p>}
        </section>
      </article>

      <p className="text-center text-[11px] text-muted-foreground print:hidden">
        Document généré automatiquement — conservez-le pour vos garanties et vos démarches.
      </p>
    </div>
  );
}
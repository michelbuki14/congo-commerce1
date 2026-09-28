import React from 'react';
import { useTranslation } from 'react-i18next';

const STYLES = {
  PENDING: 'bg-amber-100 text-amber-900',
  AUTHORIZED: 'bg-sky-100 text-sky-900',
  PAID: 'bg-emerald-100 text-emerald-900',
  CONFIRMED: 'bg-sky-100 text-sky-900',
  PROCESSING: 'bg-indigo-100 text-indigo-900',
  READY_FOR_PICKUP: 'bg-violet-100 text-violet-900',
  PICKED_UP: 'bg-indigo-100 text-indigo-900',
  SHIPPED: 'bg-indigo-100 text-indigo-900',
  IN_TRANSIT: 'bg-blue-100 text-blue-900',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-900',
  DELIVERED: 'bg-emerald-100 text-emerald-900',
  FAILED: 'bg-red-100 text-red-900',
  RETURNED: 'bg-orange-100 text-orange-900',
  CANCELLED: 'bg-slate-200 text-slate-700',
  REFUNDED: 'bg-emerald-100 text-emerald-900',
  PARTIALLY_REFUNDED: 'bg-teal-100 text-teal-900',
  REQUESTED: 'bg-amber-100 text-amber-900',
  UNDER_REVIEW: 'bg-sky-100 text-sky-900',
  APPROVED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-red-100 text-red-900',
  RETURN_IN_TRANSIT: 'bg-blue-100 text-blue-900',
  CLOSED: 'bg-slate-200 text-slate-700',
  OPEN: 'bg-amber-100 text-amber-900',
  INVESTIGATING: 'bg-sky-100 text-sky-900',
  ESCALATED: 'bg-red-100 text-red-900',
  ACTIVE: 'bg-emerald-100 text-emerald-900',
  PENDING_REVIEW: 'bg-amber-100 text-amber-900',
  DRAFT: 'bg-slate-200 text-slate-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-900',
  SUSPENDED: 'bg-red-100 text-red-900',
  ARCHIVED: 'bg-slate-200 text-slate-700',
};

const LABELS = {
  PENDING: 'En attente',
  AUTHORIZED: 'Autorisé',
  PAID: 'Payé',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'En préparation',
  READY_FOR_PICKUP: 'Prêt au retrait',
  PICKED_UP: 'Pris en charge',
  SHIPPED: 'Expédiée',
  IN_TRANSIT: 'En transit',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livré',
  FAILED: 'Échec',
  RETURNED: 'Retourné',
  CANCELLED: 'Annulé',
  REFUNDED: 'Remboursé',
  PARTIALLY_REFUNDED: 'Remb. partiel',
  REQUESTED: 'Demandé',
  UNDER_REVIEW: 'En examen',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  RETURN_IN_TRANSIT: 'Retour en cours',
  CLOSED: 'Clôturé',
  OPEN: 'Ouvert',
  INVESTIGATING: 'Enquête',
  ESCALATED: 'Escaladé',
  ACTIVE: 'Actif',
  PENDING_REVIEW: 'À valider',
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  SUSPENDED: 'Suspendu',
  ARCHIVED: 'Archivé',
};

export default function StatusBadge({ status, className = '', variant = 'default' }) {
  const { t } = useTranslation();
  if (!status) return null;
  const key = String(status).toUpperCase();
  const label = t(`status.${key}`, { defaultValue: LABELS[key] || status });
  if (variant === 'paper') {
    return <span className={`paper-badge ${className}`}>{label}</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STYLES[key] || 'bg-secondary text-foreground'} ${className}`}>
      {label}
    </span>
  );
}
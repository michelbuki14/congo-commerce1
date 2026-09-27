/**
 * Shared helpers for the personal-data request lifecycle
 * (verification email -> compliance processing -> data report).
 */

import { APP_URL } from './app.ts';

export const TYPE_LABELS = {
  access: 'Accès à vos données',
  rectification: 'Rectification de vos données',
  deletion: 'Suppression de vos données',
  opposition: 'Opposition à un traitement',
};

export function typeLabel(type) {
  return TYPE_LABELS[String(type || '').toLowerCase()] || 'Demande relative aux données';
}

export function verificationUrl(token) {
  return `${APP_URL}/functions/verifyDataRequest?token=${encodeURIComponent(token)}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toBase64(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(columns, rows) {
  return [columns.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
}

export function dedupeById(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function frenchDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
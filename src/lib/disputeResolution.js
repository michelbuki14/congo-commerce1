import { base44 } from '@/api/base44Client';
import { round2 } from '@/lib/format';

/**
 * Shared logic for the dispute resolution portal: the mediation thread, the
 * customer refund and the replacement decision. Both the admin arbitration view
 * and the seller view use these, so a case is handled the same way whoever opens
 * it. Money only ever moves from an admin session — sellers propose, mediation
 * executes (the Dispute record itself is admin-writable only).
 */

export const DISPUTE_TYPES = {
  not_received: 'disputeType.notReceived',
  wrong_product: 'disputeType.wrongProduct',
  damaged: 'disputeType.damaged',
  not_as_described: 'disputeType.notAsDescribed',
  missing_item: 'disputeType.missingItem',
  payment_issue: 'disputeType.paymentIssue',
};

export const OPEN_STATUSES = ['open', 'investigating', 'escalated'];

export const RESOLUTIONS = [
  { id: 'refund', labelKey: 'resolution.refund' },
  { id: 'replacement', labelKey: 'resolution.replacement' },
  { id: 'goodwill', labelKey: 'resolution.goodwill' },
  { id: 'reject', labelKey: 'resolution.reject' },
];

export const RESOLUTION_LABELS = RESOLUTIONS.reduce((acc, r) => ({ ...acc, [r.id]: r.labelKey }), {});

/** The mediation thread attached to a case, matched on its order number. */
export function threadFor(tickets, dispute) {
  return (tickets || []).find((t) => String(t.subject || '').includes(dispute.order_number)) || null;
}

async function upload(file) {
  if (!file) return { fileUri: '', name: '' };
  const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
  return { fileUri: uploaded.file_uri, name: file.name };
}

/** Add a message to the case thread, opening the thread on the first message. */
export async function sendCaseMessage({ dispute, ticket, body, file, author, actorName, resolution }) {
  const { fileUri, name } = await upload(file);
  const entry = {
    author,
    author_name: actorName || '',
    body,
    resolution: resolution || '',
    at: new Date().toISOString(),
    file_uri: fileUri || undefined,
    attachment_name: name || undefined,
  };
  if (ticket) {
    return base44.entities.SupportTicket.update(ticket.id, { messages: [...(ticket.messages || []), entry], status: 'open' });
  }
  return base44.entities.SupportTicket.create({
    ticket_number: `DR-${Date.now().toString(36).toUpperCase()}`,
    subject: `Résolution de litige — ${dispute.order_number}`,
    category: 'order',
    status: 'open',
    priority: 'high',
    order_number: dispute.order_number,
    customer_name: dispute.customer_name || '',
    customer_phone: dispute.customer_phone || '',
    assigned_to: author === 'admin' ? 'mediation' : 'vendeur',
    messages: [entry],
  });
}

export async function setDisputeStatus({ dispute, status, note, reviewer }) {
  const updated = await base44.entities.Dispute.update(dispute.id, {
    status,
    admin_notes: note ?? dispute.admin_notes ?? '',
  });
  await base44.entities.AuditLog.create({
    action: `dispute.${status}`,
    actor: reviewer?.role === 'admin' ? 'admin' : 'mediation',
    entity: 'Dispute',
    entity_id: dispute.id,
    reference: dispute.order_number,
    severity: status === 'resolved_seller' ? 'warning' : 'info',
    details: { amount_usd: dispute.amount_usd, reviewer: reviewer?.email || '' },
  });
  return updated;
}

export async function notifyCustomer({ dispute, title, message }) {
  return base44.entities.Notification.create({
    title,
    message,
    type: 'payment',
    audience: 'customer',
    order_number: dispute.order_number,
  });
}

/**
 * Executes the refund through the admin `refund-payment` server function:
 * capped amount, buyer wallet credit, reversal of unreleased seller shares.
 * Dispute status and customer notice stay here (non-authoritative).
 */
export async function refundCustomer({ dispute, amount, note, reviewer }) {
  const value = round2(Number(amount) || 0);
  const res = await base44.functions.invoke('refund-payment', {
    order_number: dispute.order_number,
    amount: value,
    reason: `Litige ${dispute.order_number}`,
    dispute_id: dispute.id,
  });
  if (!res?.data?.order) {
    throw new Error(res?.data?.error || 'Remboursement impossible.');
  }

  await notifyCustomer({
    dispute,
    title: `Remboursement de ${value.toFixed(2)} $`,
    message: `Votre litige sur ${dispute.order_number} est tranché en votre faveur. Le montant est crédité sur votre portefeuille.`,
  });

  const updated = await setDisputeStatus({
    dispute,
    status: 'resolved_buyer',
    note: note || `Remboursement de ${value.toFixed(2)} $ exécuté`,
    reviewer,
  });
  return { dispute: updated, amount: value };
}

/** Approves a replacement: the seller is told to reship and the case closes. */
export async function approveReplacement({ dispute, note, reviewer }) {
  await base44.entities.Notification.create({
    title: `Remplacement à expédier — ${dispute.order_number}`,
    message: `La médiation approuve un remplacement sur la commande ${dispute.order_number} (${dispute.customer_name || 'client'}). Réexpédiez l'article et transmettez le suivi.`,
    type: 'order',
    audience: 'seller',
    order_number: dispute.order_number,
  });
  await notifyCustomer({
    dispute,
    title: `Remplacement approuvé — ${dispute.order_number}`,
    message: `Le vendeur va réexpédier votre article. Vous recevrez le numéro de suivi dès l'expédition.`,
  });
  const updated = await setDisputeStatus({
    dispute,
    status: 'resolved_buyer',
    note: note || 'Remplacement approuvé — réexpédition demandée au vendeur',
    reviewer,
  });
  return updated;
}

/** Rejects the claim in the seller's favour and closes the case. */
export async function rejectClaim({ dispute, note, reviewer }) {
  await notifyCustomer({
    dispute,
    title: `Litige clôturé — ${dispute.order_number}`,
    message: `Après examen, la demande n'a pas été retenue. Contactez le support pour toute pièce complémentaire.`,
  });
  return setDisputeStatus({
    dispute,
    status: 'resolved_seller',
    note: note || 'Demande rejetée après examen des pièces',
    reviewer,
  });
}
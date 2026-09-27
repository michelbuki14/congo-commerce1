import { formatUSD } from './format';

/**
 * Customer order updates: one message per delivery milestone, in the customer's
 * own language and with everything they need to follow the parcel themselves.
 */

export const ORDER_STATUS_EVENTS = {
  PENDING: 'order_confirmed',
  CONFIRMED: 'order_confirmed',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'in_transit',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

function origin() {
  try {
    return window.location.origin;
  } catch {
    return '';
  }
}

function orderLink(order) {
  return `${origin()}/order/${order.order_number}`;
}

function greeting(order) {
  const name = String(order.customer_name || '').trim();
  return name ? `Bonjour ${name},` : 'Bonjour,';
}

function shipmentLine(fulfillment) {
  if (!fulfillment) return '';
  const bits = [];
  if (fulfillment.tracking_number) bits.push(`Suivi : ${fulfillment.tracking_number}`);
  if (fulfillment.courier_name) bits.push(fulfillment.courier_name);
  if (fulfillment.estimated_delivery) bits.push(`Livraison estimée : ${fulfillment.estimated_delivery}`);
  return bits.join(' · ');
}

const TEMPLATES = {
  order_confirmed: {
    label: 'Commande confirmée',
    subject: (o) => `Commande ${o.order_number} confirmée`,
    body: (o) =>
      [
        greeting(o),
        `Votre commande ${o.order_number} est confirmée pour un total de ${formatUSD(o.total_usd)} (${(o.items || []).length} article(s)).`,
        o.payment_status === 'PENDING'
          ? 'Paiement à la livraison enregistré.'
          : 'Votre paiement a bien été reçu.',
        `Suivez votre commande : ${orderLink(o)}`,
      ].join('\n\n'),
  },
  processing: {
    label: 'En préparation',
    subject: (o) => `Commande ${o.order_number} en préparation`,
    body: (o, f) =>
      [
        greeting(o),
        `Votre commande ${o.order_number} est en préparation chez le vendeur.`,
        shipmentLine(f),
        `Détails : ${orderLink(o)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  ready_for_pickup: {
    label: 'Prêt au retrait',
    subject: (o) => `Commande ${o.order_number} prête à être retirée`,
    body: (o) =>
      [
        greeting(o),
        `Votre commande ${o.order_number} est prête${o.pickup_point_name ? ` au point de retrait ${o.pickup_point_name}` : ' au point de retrait'}.`,
        o.pickup_code ? `Code de retrait à présenter : ${o.pickup_code}` : '',
        `Détails : ${orderLink(o)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  in_transit: {
    label: 'En cours de livraison',
    subject: (o) => `Commande ${o.order_number} en route`,
    body: (o, f) =>
      [
        greeting(o),
        `Votre colis ${o.order_number} a été pris en charge et voyage vers vous.`,
        shipmentLine(f),
        `Suivi : ${orderLink(o)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  out_for_delivery: {
    label: 'En livraison',
    subject: (o) => `Commande ${o.order_number} en livraison aujourd'hui`,
    body: (o, f) =>
      [
        greeting(o),
        `Notre livreur est en route pour votre commande ${o.order_number}.`,
        shipmentLine(f),
        `Merci de rester joignable au ${o.customer_phone || 'numéro indiqué'}.`,
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  delivered: {
    label: 'Livré',
    subject: (o) => `Commande ${o.order_number} livrée`,
    body: (o, f) =>
      [
        greeting(o),
        `Votre commande ${o.order_number} a été livrée${f?.delivered_to ? ` à ${f.delivered_to}` : ''}.`,
        'Un problème avec l’article ? Ouvrez un litige depuis votre commande dans les 7 jours.',
        `Votre commande : ${orderLink(o)}`,
      ].join('\n\n'),
  },
  failed: {
    label: 'Livraison échouée',
    subject: (o) => `Commande ${o.order_number} : livraison à reprogrammer`,
    body: (o, f) =>
      [
        greeting(o),
        `La livraison de votre commande ${o.order_number} n’a pas abouti.`,
        shipmentLine(f),
        'Répondez à ce message pour convenir d’un nouveau créneau.',
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  returned: {
    label: 'Retour enregistré',
    subject: (o) => `Commande ${o.order_number} : retour enregistré`,
    body: (o) =>
      [
        greeting(o),
        `Le retour de votre commande ${o.order_number} a été enregistré.`,
        `Détails : ${orderLink(o)}`,
      ].join('\n\n'),
  },
  cancelled: {
    label: 'Commande annulée',
    subject: (o) => `Commande ${o.order_number} annulée`,
    body: (o) =>
      [
        greeting(o),
        `Votre commande ${o.order_number} a été annulée.`,
        'Si un paiement a été encaissé, il vous est restitué selon le moyen utilisé.',
      ].join('\n\n'),
  },
};

/**
 * Builds the customer message for a milestone. An explicit `event` wins;
 * otherwise the fulfillment status decides. Unknown statuses produce nothing.
 */
export function buildOrderUpdate({ order, fulfillment = null, status = '', event = '' }) {
  if (!order) return null;
  const key = event || ORDER_STATUS_EVENTS[String(status).toUpperCase()] || '';
  const template = TEMPLATES[key];
  if (!template) return null;
  return {
    event: key,
    label: template.label,
    subject: template.subject(order),
    message: template.body(order, fulfillment),
  };
}
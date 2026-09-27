import { round2 } from './format';

/**
 * PAYMENT ABSTRACTION
 * A PaymentProvider is a plain object with the shape below. Adding a real
 * provider (M-Pesa, Airtel Money, Orange Money, a card PSP…) means adding an
 * entry to PAYMENT_PROVIDERS — the checkout flow never changes.
 *
 *   {
 *     id, name, kind: 'mobile_money' | 'card' | 'cash',
 *     currencies: string[],
 *     feePercent: number,
 *     instructions: string,
 *     isMock: boolean,
 *     async charge({ amount, currency, phone, orderNumber, metadata })
 *       -> { status, provider_txn_id, redirect_url?, message }
 *     async refund({ provider_txn_id, amount })
 *       -> { status, provider_txn_id }
 *   }
 */

function mockTxn(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export const PAYMENT_PROVIDERS = {
  mpesa: {
    id: 'mpesa',
    name: 'M-Pesa',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Vous recevrez une demande de paiement sur votre téléphone. Entrez votre code secret M-Pesa.',
    isMock: true,
    async charge({ amount, phone, orderNumber }) {
      if (!phone) throw new Error('Un numéro de téléphone est requis pour M-Pesa.');
      return { status: 'PAID', provider_txn_id: mockTxn('MPESA'), amount: round2(amount), message: `Paiement M-Pesa confirmé pour la commande ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
  airtel: {
    id: 'airtel',
    name: 'Airtel Money',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Validez la demande de paiement Airtel Money reçue sur votre téléphone.',
    isMock: true,
    async charge({ amount, phone, orderNumber }) {
      if (!phone) throw new Error('Un numéro de téléphone est requis pour Airtel Money.');
      return { status: 'PAID', provider_txn_id: mockTxn('AIRTEL'), amount: round2(amount), message: `Paiement Airtel Money confirmé pour la commande ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
  orange: {
    id: 'orange',
    name: 'Orange Money',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Validez la demande de paiement Orange Money reçue sur votre téléphone.',
    isMock: true,
    async charge({ amount, phone, orderNumber }) {
      if (!phone) throw new Error('Un numéro de téléphone est requis pour Orange Money.');
      return { status: 'PAID', provider_txn_id: mockTxn('ORANGE'), amount: round2(amount), message: `Paiement Orange Money confirmé pour la commande ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
  card: {
    id: 'card',
    name: 'Carte bancaire (Visa / Mastercard)',
    kind: 'card',
    currencies: ['USD'],
    feePercent: 3.2,
    requiresPhone: false,
    instructions: 'Vous serez redirigé vers la page sécurisée de notre prestataire. Aucune donnée de carte ne transite par Congo Commerce.',
    isMock: false,
    hostedCheckout: true,
    // Real card payment: the order stays PENDING until the provider's signed webhook confirms it.
    async charge({ amount, orderNumber }) {
      return { status: 'PENDING', provider_txn_id: '', amount: round2(amount), message: `Redirection vers le paiement sécurisé pour ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
  cod: {
    id: 'cod',
    name: 'Paiement à la livraison',
    kind: 'cash',
    currencies: ['CDF', 'USD'],
    feePercent: 0,
    requiresPhone: true,
    instructions: 'Vous payez en espèces au livreur ou au point de retrait, à la réception du colis.',
    isMock: true,
    async charge({ amount, orderNumber }) {
      return { status: 'PENDING', provider_txn_id: mockTxn('COD'), amount: round2(amount), message: `Commande ${orderNumber} enregistrée. Paiement à la livraison.` };
    },
    async refund() {
      return { status: 'CANCELLED', provider_txn_id: null };
    },
  },
  wallet: {
    id: 'wallet',
    name: 'Portefeuille Congo Commerce',
    kind: 'wallet',
    currencies: ['USD'],
    feePercent: 0,
    requiresPhone: false,
    instructions: 'Le montant est débité de votre solde portefeuille.',
    isMock: true,
    async charge({ amount, orderNumber }) {
      return { status: 'PAID', provider_txn_id: mockTxn('WALLET'), amount: round2(amount), message: `Payé avec le portefeuille pour ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
};

export function listPaymentProviders() {
  return Object.values(PAYMENT_PROVIDERS);
}

export function getPaymentProvider(id) {
  const provider = PAYMENT_PROVIDERS[id];
  if (!provider) throw new Error(`Moyen de paiement inconnu : ${id}`);
  return provider;
}

export function providerLabel(id) {
  return PAYMENT_PROVIDERS[id]?.name || id;
}
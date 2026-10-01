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

/**
 * Helper to get environment variable with fallback.
 * In Vite, env vars are exposed via import.meta.env.
 * We assume the bundler replaces them at build time.
 */
function getEnvVar(key, defaultValue) {
  // @ts-ignore
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  if (env[key]) {
    return env[key];
  }
  // For Deno (functions) we might need a different approach, but this file is frontend-only.
  // If running in Deno, we would use Deno.env.get(key).
  // For simplicity, we rely on mock fallback when env not set.
  return defaultValue;
}

// Mock transaction ID generator
function mockTxn(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

// Real provider implementations (stubs - replace with actual API calls)
// These functions will only be called if the corresponding env vars are set.
// Otherwise, the mock providers below will be used.

async function realMpesaCharge({ amount, phone, orderNumber }) {
  const token = getEnvVar('VITE_MPESA_TOKEN', '');
  if (!token) throw new Error('M-Pesa token not configured');
  // Placeholder: Implement actual Safaricom M-Pesa Daraja API call
  // Example: POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
  // For now, we simulate success but in real implementation you would make the HTTP call.
  // We'll still return a mock transaction but note that real implementation would parse the response.
  console.warn('[M-Pesa] Using mock charge - replace with real API call');
  return { status: 'PAID', provider_txn_id: `MPESA-${Date.now()}`, amount: round2(amount), message: `Paiement M-Pesa confirmé pour la commande ${orderNumber}.` };
}

async function realMpesaRefund({ provider_txn_id, amount }) {
  const token = getEnvVar('VITE_MPESA_TOKEN', '');
  if (!token) throw new Error('M-Pesa token not configured');
  console.warn('[M-Pesa] Using mock refund - replace with real API call');
  return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
}

async function realAirtelCharge({ amount, phone, orderNumber }) {
  const token = getEnvVar('VITE_AIRTEL_TOKEN', '');
  if (!token) throw new Error('Airtel token not configured');
  console.warn('[Airtel 직접] Using mock charge - replace with real API call');
  return { status: 'PAID', provider_txn_id: `AIRTEL-${Date.now()}`, amount: round2(amount), message: `Paiement Airtel Money confirmé pour la commande ${orderNumber}.` };
}

async function realAirtelRefund({ provider_txn_id, amount }) {
  const token = getEnvVar('VITE_AIRTEL_TOKEN', '');
  if (!token) throw new Error('Airtel token not configured');
  console.warn('[Airtel] Using mock refund - replace with real API call');
  return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
}

async function realOrangeCharge({ amount, phone, orderNumber }) {
  const token = getEnvVar('VITE_ORANGE_TOKEN', '');
  if (!token) throw new Error('Orange token not configured');
  console.warn('[Orange] Using mock charge - replace with real API call');
  return { status: 'PAID', provider_txn_id: `ORANGE-${Date.now()}`, amount: round2(amount), message: `Paiement Orange Money confirmé pour la commande ${orderNumber}.` };
}

async function realOrangeRefund({ provider_txn_id, amount }) {
  const token = getEnvVar('VITE_ORANGE_TOKEN', '');
  if (!token) throw new Error('Orange token not configured');
  console.warn('[Orange] Using mock refund - replace with real API call');
  return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
}

// Card provider: we assume a hosted checkout (like Stripe) where the frontend handles the redirect.
// The charge function returns PENDING and the webhook confirms.
async function realCardCharge({ amount, orderNumber }) {
  const publishableKey = getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', '');
  if (!publishableKey) throw new Error('Stripe publishable key not configured');
  // In real implementation, you would create a PaymentIntent and return its client_secret.
  // For now, we keep the same behavior as mock but note that real implementation would differ.
  console.warn('[Card] Using mock charge - replace with real PaymentIntent creation');
  return { status: 'PENDING', provider_txn_id: '', amount: round2(amount), message: `Redirection vers le paiement sécurisé pour ${orderNumber}.` };
}

async function realCardRefund({ provider_txn_id, amount }) {
  const secretKey = getEnvVar('VITE_STRIPE_SECRET_KEY', '');
  if (!secretKey) throw new Error('Stripe secret key not configured');
  console.warn('[Card] Using mock refund - replace with real Refund API');
  return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
}

// COD and Wallet remain mock as they are offline.
export const PAYMENT_PROVIDERS = {
  mpesa: {
    id: 'mpesa',
    name: 'M-Pesa',
    nameKey: 'pay.mpesaName',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Vous recevrez une demande de paiement sur votre téléphone. Entrez votre code secret M-Pesa.',
    instructionsKey: 'pay.mpesaInstructions',
    isMock: !(getEnvVar('VITE_MPESA_TOKEN', '') && getEnvVar('VITE_MPESA_TOKEN', '') !== ''),
    async charge({ amount, phone, orderNumber }) {
      const token = getEnvVar('VITE_MPESA_TOKEN', '');
      if (token) {
        return await realMpesaCharge({ amount, phone, orderNumber });
      }
      return mockTxnBasedCharge('MPESA', amount, orderNumber, `Paiement M-Pesa confirmé pour la commande ${orderNumber}.`);
    },
    async refund({ provider_txn_id, amount }) {
      const token = getEnvVar('VITE_MPESA_TOKEN', '');
      if (token) {
        return await realMpesaRefund({ provider_txn_id, amount });
      }
      return mockTxnBasedRefund('MPESA', provider_txn_id, amount);
    },
  },
  airtel: {
    id: 'airtel',
    name: 'Airtel Money',
    nameKey: 'pay.airtelName',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Validez la demande de paiement Airtel Money reçue sur votre téléphone.',
    instructionsKey: 'pay.airtelInstructions',
    isMock: !(getEnvVar('VITE_AIRTEL_TOKEN', '') && getEnvVar('VITE_AIRTEL_TOKEN', '') !== ''),
    async charge({ amount, phone, orderNumber }) {
      const token = getEnvVar('VITE_AIRTEL_TOKEN', '');
      if (token) {
        return await realAirtelCharge({ amount, phone, orderNumber });
      }
      return mockTxnBasedCharge('AIRTEL', amount, orderNumber, `Paiement Airtel Money confirmé pour la commande ${orderNumber}.`);
    },
    async refund({ provider_txn_id, amount }) {
      const token = getEnvVar('VITE_AIRTEL_TOKEN', '');
      if (token) {
        return await realAirtelRefund({ provider_txn_id, amount });
      }
      return mockTxnBasedRefund('AIRTEL', provider_txn_id, amount);
    },
  },
  orange: {
    id: 'orange',
    name: 'Orange Money',
    nameKey: 'pay.orangeName',
    kind: 'mobile_money',
    currencies: ['CDF', 'USD'],
    feePercent: 2.5,
    requiresPhone: true,
    instructions: 'Validez la demande de paiement Orange Money reçue sur votre téléphone.',
    instructionsKey: 'pay.orangeInstructions',
    isMock: !(getEnvVar('VITE_ORANGE_TOKEN', '') && getEnvVar('VITE_ORANGE_TOKEN', '') !== ''),
    async charge({ amount, phone, orderNumber }) {
      const token = getEnvVar('VITE_ORANGE_TOKEN', '');
      if (token) {
        return await realOrangeCharge({ amount, phone, orderNumber });
      }
      return mockTxnBasedCharge('ORANGE', amount, orderNumber, `Paiement Orange Money confirmé pour la commande ${orderNumber}.`);
    },
    async refund({ provider_txn_id, amount }) {
      const token = getEnvVar('VITE_ORANGE_TOKEN', '');
      if (token) {
        return await realOrangeRefund({ provider_txn_id, amount });
      }
      return mockTxnBasedRefund('ORANGE', provider_txn_id, amount);
    },
  },
  card: {
    id: 'card',
    name: 'Carte bancaire (Visa / Mastercard)',
    nameKey: 'pay.cardName',
    kind: 'card',
    currencies: ['USD'],
    feePercent: 3.2,
    requiresPhone: false,
    instructions: 'Vous serez redirigé vers la page sécurisée de notre prestataire. Aucune donnée de carte ne transite par Congo Commerce.',
    instructionsKey: 'pay.cardInstructions',
    isMock: !(getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', '') && getEnvVar('VITE_STRIPE_SECRET_KEY', '') !== ''),
    async charge({ amount, orderNumber }) {
      const pk = getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', '');
      const sk = getEnvVar('VITE_STRIPE_SECRET_KEY', '');
      if (pk && sk) {
        return await realCardCharge({ amount, orderNumber });
      }
      return { status: 'PENDING', provider_txn_id: '', amount: round2(amount), message: `Redirection vers le paiement sécurisé pour ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      const sk = getEnvVar('VITE_STRIPE_SECRET_KEY', '');
      if (sk) {
        return await realCardRefund({ provider_txn_id, amount });
      }
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
  cod: {
    id: 'cod',
    name: 'Paiement à la livraison',
    nameKey: 'pay.codName',
    kind: 'cash',
    currencies: ['CDF', 'USD'],
    feePercent: 0,
    requiresPhone: true,
    instructions: 'Vous payez en espèces au livreur ou au point de retrait, à la réception du colis.',
    instructionsKey: 'pay.codInstructions',
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
    nameKey: 'pay.walletName',
    kind: 'wallet',
    currencies: ['USD'],
    feePercent: 0,
    requiresPhone: false,
    instructions: 'Le montant est débité de votre solde portefeuille.',
    instructionsKey: 'pay.walletInstructions',
    isMock: true,
    async charge({ amount, orderNumber }) {
      return { status: 'PAID', provider_txn_id: mockTxn('WALLET'), amount: round2(amount), message: `Payé avec le portefeuille pour ${orderNumber}.` };
    },
    async refund({ provider_txn_id, amount }) {
      return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
    },
  },
};

/**
 * Fallback mock implementations used when env vars are not set.
 * These are the original mock implementations kept for backward compatibility.
 */
function mockTxnBasedCharge(prefix, amount, orderNumber, message) {
  return { status: 'PAID', provider_txn_id: mockTxn(prefix), amount: round2(amount), message };
}
function mockTxnBasedRefund(prefix, provider_txn_id, amount) {
  return { status: 'REFUNDED', provider_txn_id: `RF-${provider_txn_id}`, amount: round2(amount) };
}

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
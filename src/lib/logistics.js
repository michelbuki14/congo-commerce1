import { round2 } from './format';

/**
 * LOGISTICS ABSTRACTION
 * A CourierProvider is a plain object:
 *   { id, name, isMock, supportsTracking, supportsCod, serviceAreas,
 *     calculateRate({ weightKg, city }), createShipment({...}),
 *     trackShipment(trackingNumber), cancelShipment(id) }
 * Congolese couriers plug in here later without touching the order engine.
 */

const TRACKING_EVENTS = [
  { status: 'PICKED_UP', label: 'Colis pris en charge' },
  { status: 'IN_TRANSIT', label: 'En transit vers la ville de destination' },
  { status: 'OUT_FOR_DELIVERY', label: 'En cours de livraison' },
  { status: 'DELIVERED', label: 'Livré' },
];

function makeCourier(config) {
  return {
    ...config,
    calculateRate({ weightKg = 0.5, city } = {}) {
      if (city && config.serviceAreas.length && !config.serviceAreas.includes(city)) {
        return { available: false, fee: 0, eta: null, reason: `${config.name} ne dessert pas encore ${city}.` };
      }
      const fee = round2(config.baseRate + config.perKg * Math.max(0, weightKg));
      return { available: true, fee, eta: config.etaDays, provider: config.name };
    },
    createShipment({ orderNumber }) {
      const trackingNumber = `${config.code.toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      return {
        tracking_number: trackingNumber,
        courier_name: config.name,
        status: 'PENDING',
        events: [{ status: 'PENDING', label: `Étiquette créée pour ${orderNumber}`, at: new Date().toISOString() }],
      };
    },
    trackShipment(trackingNumber) {
      const idx = Math.abs(hash(trackingNumber)) % TRACKING_EVENTS.length;
      return TRACKING_EVENTS.slice(0, idx + 1).map((e, i) => ({
        ...e,
        at: new Date(Date.now() - (idx - i) * 36e5 * 8).toISOString(),
      }));
    },
    cancelShipment() {
      return { status: 'CANCELLED' };
    },
  };
}

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return h;
}

const ALL_CITIES = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Matadi', 'Kolwezi'];

export const COURIER_PROVIDERS = {
  kin_express: makeCourier({
    id: 'kin_express',
    name: 'Kin Express',
    code: 'KEX',
    isMock: true,
    supportsTracking: true,
    supportsCod: true,
    serviceAreas: ALL_CITIES,
    baseRate: 3,
    perKg: 1,
    etaDays: '2-4 jours',
  }),
  congo_logistique: makeCourier({
    id: 'congo_logistique',
    name: 'Congo Logistique',
    code: 'CLG',
    isMock: true,
    supportsTracking: true,
    supportsCod: true,
    serviceAreas: ['Kinshasa', 'Matadi', 'Lubumbashi'],
    baseRate: 4.5,
    perKg: 0.8,
    etaDays: '3-6 jours',
  }),
  katanga_moves: makeCourier({
    id: 'katanga_moves',
    name: 'Katanga Moves',
    code: 'KTM',
    isMock: true,
    supportsTracking: false,
    supportsCod: true,
    serviceAreas: ['Lubumbashi', 'Kolwezi', 'Kinshasa'],
    baseRate: 3.5,
    perKg: 1.2,
    etaDays: '4-7 jours',
  }),
};

export function listCouriers() {
  return Object.values(COURIER_PROVIDERS);
}

export function getCourier(id) {
  return COURIER_PROVIDERS[id] || COURIER_PROVIDERS.kin_express;
}

/** Picks the cheapest courier that actually serves the destination city. */
export function selectCourierFor(city, weightKg = 0.5) {
  const options = listCouriers()
    .map((c) => ({ courier: c, quote: c.calculateRate({ city, weightKg }) }))
    .filter((o) => o.quote.available)
    .sort((a, b) => a.quote.fee - b.quote.fee);
  return options[0] || null;
}

export const SHIPMENT_STATUS_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
  'CANCELLED',
];

/**
 * International imports never touch a local courier: the goods are received at
 * our own warehouse abroad, approved by the customer, then flown to destination.
 */
export const INTL_TRACKING_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'AWAITING_CUSTOMER_APPROVAL',
  'PACKING',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const SHIPMENT_STATUS_LABELS = {
  PENDING: 'status.PENDING',
  CONFIRMED: 'status.CONFIRMED',
  PROCESSING: 'status.PROCESSING',
  AWAITING_CUSTOMER_APPROVAL: 'status.AWAITING_CUSTOMER_APPROVAL',
  PACKING: 'status.PACKING',
  READY_FOR_PICKUP: 'status.READY_FOR_PICKUP',
  PICKED_UP: 'status.PICKED_UP',
  IN_TRANSIT: 'status.IN_TRANSIT',
  OUT_FOR_DELIVERY: 'status.OUT_FOR_DELIVERY',
  DELIVERED: 'status.DELIVERED',
  FAILED: 'status.FAILED',
  RETURNED: 'status.RETURNED',
  CANCELLED: 'status.CANCELLED',
};
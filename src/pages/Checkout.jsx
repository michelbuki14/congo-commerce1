import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/cart';
import { useCurrency } from '@/lib/currency';
import { loadPlatformConfig } from '@/lib/config';
import { findIntlOption, getIntlOptions, intlWeightKg } from '@/lib/intlDelivery';
import { listPaymentProviders } from '@/lib/payments';
import { buildCheckoutQuote, findCoupon, placeOrder } from '@/lib/orderService';
import { getProfile, saveProfile } from '@/lib/session';
import EmptyState from '@/components/EmptyState';
import { formatUSD } from '@/lib/format';
import { getVatRate } from '@/lib/tax';
import { validateMobileMoneyNumber } from '@/lib/mobileMoney';
import MobileActionBar from '@/components/MobileActionBar';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import StepDelivery from '@/components/checkout/StepDelivery';
import StepPayment from '@/components/checkout/StepPayment';
import StepReview from '@/components/checkout/StepReview';

const STEP_KEYS = ['checkout.stepDelivery', 'checkout.stepPayment', 'checkout.stepReview'];
const STEP_COMPONENTS = [StepDelivery, StepPayment, StepReview];

export default function Checkout() {
  const { t } = useTranslation();
  const STEPS = STEP_KEYS.map((k) => t(k));
  const { items, clear, count } = useCart();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(getProfile());
  const [deliveryMethod, setDeliveryMethod] = useState('home_delivery');
  const [pickupPointId, setPickupPointId] = useState('');
  const [intlOptionId, setIntlOptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [payPhone, setPayPhone] = useState(() => getProfile().phone || '');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [zones, setZones] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [consent, setConsent] = useState({ terms: false, marketing: false });
  const [vatRate, setVatRate] = useState(getVatRate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const providers = useMemo(() => listPaymentProviders(), []);
  const activeProvider = providers.find((p) => p.id === paymentMethod) || providers[0];
  const isMobileMoney = activeProvider?.kind === 'mobile_money';

  useEffect(() => {
    loadPlatformConfig().then(() => setVatRate(getVatRate()));
    (async () => {
      const [z, p] = await Promise.all([
        base44.entities.DeliveryZone.filter({ active: true }).catch(() => []),
        base44.entities.PickupPoint.filter({ active: true }).catch(() => []),
      ]);
      setZones(z);
      setPickupPoints(p);
      if (p[0]) setPickupPointId(p[0].id);
    })();
  }, []);

  const selectedZone = zones.find((z) => z.city === profile.city) || zones[0] || null;
  const selectedPickup = pickupPoints.find((p) => p.id === pickupPointId) || null;

  const deliveryFee = deliveryMethod === 'pickup_point'
    ? Number(selectedPickup?.fee_usd || 0)
    : Number(selectedZone?.fee_usd || 0);

  // Imported goods never ride a partner courier: our own delivery team carries
  // them, on its own tariff, and the customer picks the service level here.
  const intlOptions = getIntlOptions();
  const selectedIntlOption = findIntlOption(intlOptionId) || intlOptions[0] || null;
  const hasIntl = (quote?.lines || []).some((l) => l.product.source_type === 'international_supplier');
  const intlWeight = intlWeightKg(quote?.lines || []);

  useEffect(() => {
    if (!items.length) {
      setLoadingQuote(false);
      return;
    }
    let alive = true;
    setLoadingQuote(true);
    buildCheckoutQuote({ items, deliveryFee, coupon, intlOption: selectedIntlOption })
      .then((q) => {
        if (alive) setQuote(q);
      })
      .catch(() => {
        if (alive) setQuote(null);
      })
      .finally(() => {
        if (alive) setLoadingQuote(false);
      });
    return () => {
      alive = false;
    };
  }, [items, deliveryFee, coupon, selectedIntlOption?.id]);

  const groups = useMemo(() => {
    if (!quote?.lines?.length) return [];
    const map = new Map();
    quote.lines.forEach((l) => {
      const p = l.product;
      const key = p.source_type === 'local_seller' ? `s-${p.seller_id}` : `f-${p.supplier_id || p.source_type}`;
      if (!map.has(key)) {
        map.set(key, {
          label: p.source_type === 'local_seller' ? p.seller_name || t('checkout.localSeller') : p.supplier_name || t('checkout.intlSupplier'),
          intl: p.source_type === 'international_supplier',
          count: 0,
        });
      }
      map.get(key).count += l.quantity;
    });
    return [...map.values()];
  }, [quote]);

  /** Blocks the buyer on the current step instead of showing every error at once. */
  const validateStep = (index) => {
    if (index === 0) {
      if (!profile.name?.trim() || !profile.phone?.trim()) {
        return t('checkout.needNamePhone');
      }
      if (deliveryMethod === 'home_delivery' && !profile.address?.trim()) {
        return t('checkout.needAddress');
      }
      if (deliveryMethod === 'pickup_point' && !selectedPickup) {
        return t('checkout.needPickup');
      }
      return '';
    }
    if (index === 1 && isMobileMoney) {
      const check = validateMobileMoneyNumber(paymentMethod, payPhone);
      if (!check.ok) return check.error;
      return '';
    }
    if (index === 2 && !consent.terms) {
      return t('checkout.needTerms');
    }
    return '';
  };

  const goToStep = (index) => {
    setError('');
    setStep(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    goToStep(Math.min(step + 1, STEPS.length - 1));
  };

  const applyCoupon = async () => {
    setCouponMessage('');
    const found = await findCoupon(couponInput);
    if (!found) {
      setCoupon(null);
      setCouponMessage(t('checkout.couponInvalid'));
      return;
    }
    setCoupon(found);
    setCouponMessage(`Code ${found.code} appliqué.`);
  };

  const submit = async (e) => {
    e.preventDefault();
    // Desktop shows every step at once, so re-check them all in order.
    for (let i = 0; i < STEPS.length; i += 1) {
      const message = validateStep(i);
      if (message) {
        setError(message);
        setStep(i);
        return;
      }
    }
    setError('');
    const chargePhone = isMobileMoney
      ? validateMobileMoneyNumber(paymentMethod, payPhone).phone
      : profile.phone;
    setSubmitting(true);
    saveProfile(profile);
    try {
      const result = await placeOrder({
        items,
        profile,
        delivery: {
          method: deliveryMethod,
          fee_usd: deliveryFee,
          address: profile.address,
          pickup_point_id: selectedPickup?.id || '',
          pickup_point_name: selectedPickup?.name || '',
          intl_option_id: hasIntl ? selectedIntlOption?.id || '' : '',
          notes,
        },
        couponCode: coupon?.code || '',
        paymentMethodId: paymentMethod,
        paymentPhone: chargePhone,
        consent,
      });
      if (activeProvider?.hostedCheckout) {
        const res = await base44.functions.invoke('create-checkout', { productId: result.order.order_number });
        clear();
        window.location.href = res.data.redirectUrl;
        return;
      }
      clear();
      navigate(`/order/${result.order.order_number}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('checkout.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const stepProps = [
    {
      profile,
      setProfile,
      deliveryMethod,
      setDeliveryMethod,
      pickupPoints,
      pickupPointId,
      setPickupPointId,
      notes,
      setNotes,
      groups,
      showIntl: hasIntl,
      intlOptions,
      setIntlOptionId,
      selectedIntlOption,
      intlWeight,
    },
    {
      providers,
      paymentMethod,
      setPaymentMethod,
      isMobileMoney,
      payPhone,
      setPayPhone,
      couponInput,
      setCouponInput,
      applyCoupon,
      coupon,
      couponMessage,
    },
    { quote, loadingQuote, coupon, vatRate, currency, consent, setConsent },
  ];

  if (!count) {
    return (
      <EmptyState
        title={t('checkout.emptyTitle')}
        description={t('checkout.emptyDesc')}
        actionTo="/"
        actionLabel={t('checkout.emptyAction')}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-32 md:pb-6">
      <div className="space-y-2">
        <Link to="/cart" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t('checkout.backToCart')}</Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('checkout.title')}</h1>
      </div>

      <CheckoutSteps steps={STEPS} current={step} />

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Mobile : une étape à la fois */}
      <div className="space-y-5 md:hidden">
        {STEP_COMPONENTS.map((StepComponent, i) =>
          step === i ? <StepComponent key={i} {...stepProps[i]} /> : null
        )}
      </div>

      {/* Desktop : toutes les étapes sur une seule page */}
      <div className="hidden items-start gap-6 md:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <StepDelivery {...stepProps[0]} />
          <StepPayment {...stepProps[1]} />
        </div>
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-40">
          <StepReview {...stepProps[2]} />
          <button type="submit" disabled={submitting || loadingQuote} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {submitting ? t('checkout.processing') : t('checkout.payAmount', { total: quote ? formatUSD(quote.total) : '' })}
          </button>
        </aside>
      </div>

      <MobileActionBar>
        {step === 0 ? (
          <Link
            to="/cart"
            aria-label={t('checkout.backToCart')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            aria-label={t('checkout.prevStep')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('checkout.total')}</p>
          <p className="text-base font-black leading-tight">{quote ? formatUSD(quote.total) : '—'}</p>
        </div>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground"
          >
            {t('checkout.continue')} <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting || loadingQuote}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? t('checkout.processingShort') : t('checkout.pay')}
          </button>
        )}
      </MobileActionBar>
    </form>
  );
}
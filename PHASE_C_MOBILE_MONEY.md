# Phase C — Real mobile-money collection (scope)

Status: scoped, not started. Blocked on a merchant account + API keys (section 5).

## 1. Recommendation: Maishapay

DRC-native aggregator covering exactly this app's three networks. Verified facts
(sources: maishapay.net/tarif.php, maishapay.net/api_docs, March 2026 web check):

- Inbound RDC: Airtel Money / M-Pesa / Orange Money / Visa / Mastercard at **3.5 %**,
  Illicocash / UnionPay at 2 %.
- REST API (`marchand.maishapay.online`) with **sandbox keys** (`MP-SBPK…` /
  `MP-SBSK…`) and live keys (`MP-LIVEPK…` / `MP-LIVESK…`), USD + CDF.
- Provider values: `MPESA`, `ORANGE`, `AITEL` (!), `AFRICEL` — note the `AITEL`
  spelling, confirmed from their docs before coding.
- Phone validation already in-app (`src/lib/mobileMoney.js` prefixes: 81/82/83,
  96–99, 84/85/89) matches their network map.
- Runner-up: **CinetPay** (pan-African francophone, one API). Pick it only if
  Maishapay onboarding stalls — the integration shape below is identical.
- Rejected: direct operator APIs (3 contracts, 3 webhooks, months of paperwork).

## 2. How it plugs into the tunnel (no redesign)

Phase B already created the seams; Phase C fills them:

1. `place-order`: for `mobile_money`, call Maishapay collection server-side
   (secret key from `Deno.env`, never the browser), store the provider
   reference, keep the order PENDING + unverified. No fake txn ids — this
   finally makes the `payment_reference` real.
2. New `mobile-money-webhook` function: verify the callback signature, resolve
   by provider reference (idempotency same pattern as `payments-webhook`),
   then run the **same grant** as `confirm-payment` (extract to
   `base44/shared/grantPayment.ts` so webhook, manual confirm, and card path
   can't drift).
3. Checkout UI: after `place-order`, mobile-money shows "validez la demande sur
   votre téléphone" and polls `get-order` until PAID/failed (timeout → support
   link). `create-checkout`/card path untouched.
4. `confirm-payment` stays as the manual fallback (SMS receipt, aggregator
   dashboard) — do not delete it.
5. Secrets: `MAISHAPAY_PUBLIC_KEY`, `MAISHAPAY_SECRET_KEY`, `GATEWAY_MODE`
   as function env; sandbox first, live after test collections.

## 3. Acceptance criteria

- Sandbox collection via a test wallet succeeds end-to-end: order PENDING →
  webhook → PAID + verified + fulfillments CONFIRMED, exactly-once under
  duplicate callbacks (send the callback twice in test).
- Tampered callback (bad signature) grants nothing; unknown reference ACKs
  without writes.
- Failed/expired collection marks the order FAILED (new: only then release the
  held stock — currently stock decrements at order time).
- `deno check`, `npm run lint`, `npm run typecheck`, `npm test` green.

## 4. Estimates

| Step | Effort |
|---|---|
| Merchant account + sandbox keys (user, section 5) | 1–3 days wall-clock |
| Collection call in `place-order` + Checkout pending UI | ~0.5 day |
| `mobile-money-webhook` + shared grant + duplicate-callback tests | ~1 day |
| Stock-hold-until-paid fix + refund path (manual MoMo refund via ledger) | ~0.5 day |
| Live-key swap + real-money pilot (small amounts, 3 networks) | ~0.5 day + monitoring |

## 5. Needed from you (nothing starts without these)

1. Maishapay merchant account at marchand.maishapay.online (business docs +
   approval — their timeline, not ours).
2. Sandbox `publicApiKey` / `secretApiKey` → then live keys after pilot.
3. Decisions: who absorbs the 3.5 % (price-included vs surcharge — CGV
   currently silent, update `src/pages/legal/CGV.jsx` accordingly), settlement
   currency USD vs CDF, and whether seller payouts later move to Maishapay
   disbursement (they support direct transfer to mobile accounts) or stay
   manual via `AdminPayouts`.

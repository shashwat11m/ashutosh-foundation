# Cashfree Integration — Setup Guide

This replaces the mock payment screen with real Cashfree checkout. Flow:
user picks a quantity → your server creates a Cashfree Order → user pays on
Cashfree's hosted checkout → Cashfree redirects them back to your site AND
independently POSTs a webhook → whichever arrives first credits the quota
(the other is a no-op, so nothing is ever credited twice).

## 1. Copy files into your project

New files:
```
services/cashfree.js
routes/webhooks.js
views/checkout.ejs
views/payment-result.ejs
```

Replaces existing files:
```
app.js                    (adds raw-body capture + mounts /webhooks)
models/Transaction.js     (adds cfOrderId, paymentSessionId, status flow)
models/User.js            (adds phone field)
routes/dashboard.js       (buy flow now talks to Cashfree instead of mocking)
views/buy-questions.ejs   (adds a phone number field, required by Cashfree)
```

Delete:
```
views/payment-mock.ejs   (no longer used — replaced by checkout.ejs)
```

## 2. Add to your .env

```
CASHFREE_CLIENT_ID=your-client-id
CASHFREE_CLIENT_SECRET=your-client-secret
CASHFREE_ENV=sandbox              # switch to "production" when you go live
CASHFREE_API_VERSION=2026-01-01
APP_BASE_URL=https://astro.ashutoshfoundation.in   # no trailing slash
```

Get `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` from the Cashfree
Merchant Dashboard (Developers → API Keys). Use your **test** keys while
`CASHFREE_ENV=sandbox`, and switch to **live** keys only when you flip
`CASHFREE_ENV=production`.

`APP_BASE_URL` is used to build the `return_url` and `notify_url` sent to
Cashfree — while developing locally with a tunnel (ngrok, etc.), set this to
your tunnel's HTTPS URL, since Cashfree needs to reach `notify_url` from the
internet.

## 3. Configure the webhook in Cashfree's dashboard

Merchant Dashboard → Developers → Webhooks → Add Webhook:
- URL: `https://your-domain.com/webhooks/cashfree`
- Events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `PAYMENT_USER_DROPPED_WEBHOOK`

Do this in both the sandbox and production dashboards (they're configured
separately).

## 4. No new npm packages needed

`axios` is already a dependency (used in `routes/kundli.js`), and signature
verification uses Node's built-in `crypto` module.

## 5. How the money actually moves

- `POST /dashboard/buy` — validates quantity + phone, creates a `Transaction`
  row with `status: "pending"`, calls Cashfree's Create Order API, gets back
  a `payment_session_id`, and renders `checkout.ejs`, which immediately opens
  Cashfree's hosted checkout via their JS SDK.
- **Webhook** (`POST /webhooks/cashfree`) — Cashfree calls this
  server-to-server once the payment finishes. The handler verifies the
  `x-webhook-signature` header using HMAC-SHA256 over
  `timestamp + raw_body` with your client secret (exactly per Cashfree's
  docs), then atomically flips the matching `Transaction` to `"success"`
  and credits `questionsLeft` — but only if it hasn't already been credited.
- **Return page** (`GET /dashboard/buy/return`) — where the user's browser
  lands after checkout. It never trusts the URL alone; it calls Cashfree's
  Get Order API to check the real status, and credits quota the same
  idempotent way if the webhook hasn't already done so. This covers users
  who close the tab before the webhook fires, or whose webhook is delayed.

## 6. Testing in sandbox

Cashfree's sandbox accepts specific test card/UPI details for simulating
success and failure — check their "Data to Test Integration" docs page for
the current test values, since these occasionally change. Test all three
outcomes (success, failure, user drops out) and confirm:
1. Quota increases exactly once per successful payment (refresh a few times
   on the result page to confirm no double-crediting).
2. A failed/dropped payment leaves quota untouched and the `Transaction`
   marked `"failed"`.
3. The webhook fires even if you close the browser tab right after paying
   (simulate this, then check the DB — quota should still update).

## 7. Going live

1. Get your live API keys from the dashboard (separate from sandbox keys).
2. Set `CASHFREE_ENV=production` and update `CASHFREE_CLIENT_ID` /
   `CASHFREE_CLIENT_SECRET` to the live ones.
3. Re-add the webhook URL in the **production** dashboard (sandbox and
   production webhook configs are separate).
4. Complete Cashfree's KYC/activation — this is where the Contact Us, Terms
   & Conditions, and Cancellation & Refund pages you already have come in.

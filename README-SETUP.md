# Signup/Login + Astrologer Query System — Setup Guide

This adds accounts, a question quota system, admin query management, and a
mock payment flow on top of your existing Ashutosh Foundation site.

## 1. Copy files into your project

Copy these into your existing repo, keeping the same folder names:

```
models/User.js
models/Question.js
models/Transaction.js
middleware/auth.js
routes/auth.js
routes/dashboard.js
scripts/createAdmin.js
views/signup.ejs
views/login.ejs
views/dashboard.ejs
views/buy-questions.ejs
views/payment-mock.ejs
views/admin-queries.ejs
views/admin-users.ejs
public/css/dashboard.css
```

These **replace** existing files (they contain your original code plus the
new pieces — nothing of yours was dropped except the duplicate-route bug
described below):

```
app.js
routes/main.js
routes/admin.js
views/admin.ejs
views/partials/header.ejs
```

## 2. Install new dependencies

```
npm install bcryptjs express-session connect-mongo
```

## 3. Add to your .env

```
SESSION_SECRET=some-long-random-string
```

(`MONGO_URI` you already have — sessions are stored in the same database.)

## 4. Create your admin (astrologer) account

```
node scripts/createAdmin.js "Astrologer Name" astrologer@example.com yourPassword
```

Run this again with a different email any time you want another admin, or
with an email that already signed up as a normal user to promote them.

## 5. What changed and why

Your original `routes/main.js` and `routes/admin.js` both defined `GET /admin`
and `POST /admin/add`. Since `mainRoutes` was mounted before `adminRoutes` in
`app.js`, Express always matched main.js's versions — `admin.js` was
effectively dead code. Fixed by moving **all** admin functionality (articles
+ the new queries/users management) into `routes/admin.js`, protected by
`requireAdmin`, and removing the duplicates from `main.js`.

## 6. How it works

- **Signup/Login**: `bcryptjs`-hashed passwords, session-based auth
  (`express-session` + `connect-mongo`). New users start with
  `questionsLeft: 3`.
- **Asking questions**: `POST /dashboard/ask` creates a `Question` and
  decrements `questionsLeft`; blocked once it hits 0.
- **Admin answering**: `/admin/queries` lists pending and answered questions;
  answering a question sets `status: "answered"`.
- **Quota top-ups**: `/admin/users` lets the admin add any amount to a user's
  `questionsLeft` directly (e.g. as a goodwill gesture, outside of payment).
- **Mock payment**: `/dashboard/buy` → pick a quantity → `/dashboard/buy`
  (POST) shows an order summary at ₹99/question (change
  `PRICE_PER_QUESTION` in `routes/dashboard.js`) → `/dashboard/buy/confirm`
  logs a `Transaction` and adds the quota. **No real gateway is wired up** —
  swap the confirm route for Razorpay/Stripe/etc. later; the `Transaction`
  model is already shaped for it (add a `gatewayOrderId` field, verify the
  signature/webhook, then run the same quota-add logic on success).
- **Styling**: everything new lives in `public/css/dashboard.css`, built
  entirely from your existing `--primary-color` / `--heading-color` /
  `--primary-lite` variables and reuses `.btn`, `.card`, `.admin-form`,
  `.admin-list`, `.admin-card` so it matches the rest of the site
  automatically.

## 7. Try it

1. `npm run dev` (or however you start the server)
2. Visit `/signup`, create a user account, ask a question
3. Log in as the admin you created, go to `/admin/queries`, answer it
4. Back on the user dashboard, the answer appears in the chat
5. Try `/dashboard/buy` to test the mock payment flow

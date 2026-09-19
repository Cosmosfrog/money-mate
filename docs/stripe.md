# Stripe Pro unlock (Money Mate)

Payment Links stay the Checkout UX. A signed webhook sets `radar_settings.is_pro`.

## Env vars (Vercel / Ship)

| Var | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes (for customer email fallback on subscription events) | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret for `POST /api/stripe/webhook` (`whsec_…`) |

No price IDs in app code — Test Payment Links are hard-coded in `src/lib/radar/pro.ts` (₹49/mo, ₹399/yr).

## Stripe Dashboard

1. **Payment Links** (both monthly + yearly): set *After payment → Redirect to*  
   `https://money-mate-e9cbi8507-money-mate1.vercel.app/?checkout=success`
2. **Webhook** endpoint:  
   `https://money-mate-e9cbi8507-money-mate1.vercel.app/api/stripe/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`
3. Paste the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## How `is_pro` is set

1. Client opens Payment Link with `?client_reference_id=<userId>` (and optional `prefilled_email`).
2. Stripe sends `checkout.session.completed` to `/api/stripe/webhook`.
3. Handler verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.
4. Maps user via, in order: `client_reference_id` → `metadata.userId` → customer email → `"user".email`.
5. Upserts `radar_settings.is_pro = true`.

`saveRadar` **ignores** client `isPro` and always re-reads DB `is_pro`, so optimistic `?checkout=success` cannot permanently unlock Pro without the webhook.

## Still honor-system / blocked without secrets

- Without `STRIPE_WEBHOOK_SECRET`, the webhook returns **503** and Pro never becomes durable.
- `?checkout=success` still flips Pro in the UI optimistically until the next hydrate/poll if the webhook has not landed.
- Do not create live prices or spend money for this wiring.

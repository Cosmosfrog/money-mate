# Money Mate

See money leave before it leaves — bill & EMI radar for Indian households.

## Stack

Vite, TanStack Router/Start, React 19, better-auth, PGlite, Tailwind.

## Run locally

```bash
npm install
npm run dev
```

Defaults to `http://0.0.0.0:8080`.

## Scripts

- `npm run dev` — local dev
- `npm run build` — production build + DB migrate
- `npm run typecheck` — TypeScript
- `npm test` — unit tests

## Dev / Usage

In **Settings**:
- **Load sample household** — seed demo rent/EMIs/utilities when empty.
- **Start fresh** — erase all bills (tap twice to confirm).

## Stripe Pro

See [docs/stripe.md](docs/stripe.md) for `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` and webhook setup.

## Auth (Google + email + phone)

Ship mode uses Better Auth **Google social**, **email/password**, and **phone OTP** (Twilio SMS). No Grok broker. No X/Twitter.

### Core env

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Long random secret (session signing) |
| `BETTER_AUTH_URL` | Public site origin, e.g. `https://your-app.vercel.app` (no trailing slash) |
| `VITE_AUTH_ENABLED` | Set to `true` so sign-in is on |

Optional: `BETTER_AUTH_TRUSTED_ORIGINS` — comma-separated full origins (custom domains).

### Google

| Variable | What it is |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client secret |

### Phone SMS (Twilio)

| Variable | What it is |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio from-number (E.164) |

### Email / password

No extra provider secrets. Password auth works when the app flag is on (enabled in code). Needs `DATABASE_URL` in production so users persist.

### Callback URL (Google)

Register on your Google OAuth client (replace with your `BETTER_AUTH_URL`):

- `{BETTER_AUTH_URL}/api/auth/callback/google`

Example: `https://money-mate.vercel.app/api/auth/callback/google`

### Sign-in UI

- **Continue with Google**
- Email + password (sign in / sign up)
- Phone: Indian mobile (+91 or 10 digits) → Send OTP → enter code → verify

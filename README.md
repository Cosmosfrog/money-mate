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

Imported from a Grok export. Wire your own auth/Stripe env as needed.

## Dev / Usage

In **Settings**:
- **Load sample household** — seed demo rent/EMIs/utilities when empty.
- **Start fresh** — erase all bills (tap twice to confirm).

## Stripe Pro

See [docs/stripe.md](docs/stripe.md) for `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` and webhook setup.

## Auth (Better Auth + Grok broker)

- Set `BETTER_AUTH_URL` to your **stable** production host when you have one (must match the public URL users open).
- Until then, Vercel hash deploys are covered via `VERCEL_URL` / `*.vercel.app` in Better Auth `trustedOrigins` / dynamic `baseURL`.
- Optional: `BETTER_AUTH_TRUSTED_ORIGINS` — comma-separated full origins (custom domains).
- **Ship / broker:** the Grok OAuth app still needs a callback allowlist. Add the public origin plus `/api/auth/callback/*` paths in the broker for every host users sign in from (stable domain and/or current `*.vercel.app` deployment).

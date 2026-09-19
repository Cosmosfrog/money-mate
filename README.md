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

## Auth (Google + X — no Grok broker required)

Tonight’s Vercel mode uses Better Auth **built-in social providers**. You do **not** need `GROK_AUTH_*`.

### Required core env

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Long random secret (session signing) |
| `BETTER_AUTH_URL` | Public site origin, e.g. `https://your-app.vercel.app` (no trailing slash). Prefer your stable production host when you have one. |
| `VITE_AUTH_ENABLED` | Set to `true` so sign-in is on (omit or any value other than `false` also leaves it on) |

Optional: `BETTER_AUTH_TRUSTED_ORIGINS` — comma-separated full origins (custom domains). Vercel hash deploys are already covered via `VERCEL_URL` / `*.vercel.app`.

### Google and/or X (pick at least one pair)

| Variable | Provider |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client secret |
| `TWITTER_CLIENT_ID` | X (Twitter) OAuth 2.0 client id |
| `TWITTER_CLIENT_SECRET` | X (Twitter) OAuth 2.0 client secret |

### Exact redirect / callback URLs

Register these on your OAuth apps (replace `YOUR_ORIGIN` with `BETTER_AUTH_URL`, e.g. `https://money-mate.vercel.app`):

- Google: `YOUR_ORIGIN/api/auth/callback/google`
- X (Twitter): `YOUR_ORIGIN/api/auth/callback/twitter`

Example:

- `https://money-mate.vercel.app/api/auth/callback/google`
- `https://money-mate.vercel.app/api/auth/callback/twitter`

If you also use preview `*.vercel.app` hosts, add those same paths for each host you sign in from (or set `BETTER_AUTH_URL` to the stable host users open).

### Buttons

Login still says **Continue with Google** / **Continue with X**. Provider ids are `google` and `twitter` (Better Auth social), not `grok-*`.

### Optional: Grok auth broker

Only if you set **both** `GROK_AUTH_CLIENT_ID` and `GROK_AUTH_CLIENT_SECRET` (optional `GROK_AUTH_ISSUER`). Preview baked defaults are **not** treated as configured on Vercel. Broker callbacks use `/api/auth/oauth2/callback/grok-google` and `/api/auth/oauth2/callback/grok-x`.

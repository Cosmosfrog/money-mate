/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Sign-in modes (Ship — Google + email + phone; no X in UI):
 *   - **Google social:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
 *     Callback: `/api/auth/callback/google`.
 *   - **Email + password:** toggled via `./email-password` (enabled for Ship).
 *   - **Phone OTP:** Better Auth `phoneNumber` plugin; SMS via Twilio when
 *     `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` are set.
 *   - **Optional Grok broker:** only when **explicit** `GROK_AUTH_CLIENT_ID` +
 *     `GROK_AUTH_CLIENT_SECRET` are set (preview baked defaults do NOT count).
 *   - Off (`VITE_AUTH_ENABLED=false`): no providers; `requireUserId` uses the
 *     dev user without a database, fail-closed when `DATABASE_URL` is set.
 *
 * `authConfigured` = auth on && (Google OR email/password OR phone Twilio OR
 * explicit broker). Dead `TWITTER_*` env still wires social if set, unused by UI.
 *
 * NEVER import this from client code — it pulls in `pg` + server-only Better
 * Auth internals. The client uses `@/lib/auth/client`.
 */
import { betterAuth } from "better-auth";
import { bearer, genericOAuth, phoneNumber } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import {
  isValidIndiaPhone,
  normalizeIndiaPhone,
  tempPhoneEmail,
} from "./phone";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { AUTH_PROVIDERS, GROK_BROKER_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import {
  GROK_ISSUER_DEFAULT,
  PREVIEW_ALLOWED_HOSTS,
} from "./preview";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Preview secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

// Explicit off-switch. The deployer sets `VITE_AUTH_ENABLED=true` when it
// provisions auth; set it to "false" to force auth off everywhere (dev user).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

// Direct Better Auth social (Google primary; TWITTER_* left as unused dead path).
const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const twitterClientId = env("TWITTER_CLIENT_ID");
const twitterClientSecret = env("TWITTER_CLIENT_SECRET");
const googleConfigured = Boolean(googleClientId && googleClientSecret);
const twitterConfigured = Boolean(twitterClientId && twitterClientSecret);
const socialConfigured = googleConfigured || twitterConfigured;

// Phone OTP via Twilio (Better Auth phoneNumber plugin).
const twilioAccountSid = env("TWILIO_ACCOUNT_SID");
const twilioAuthToken = env("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = env("TWILIO_PHONE_NUMBER");
export const phoneTwilioConfigured = Boolean(
  twilioAccountSid && twilioAuthToken && twilioPhoneNumber,
);

// Optional Grok broker — ONLY when both client id and secret are set explicitly.
// Do NOT fall back to PREVIEW_CLIENT_* here: on Vercel those defaults make
// authConfigured true with no working oauth2 client → empty HTTP 500.
const grokIssuer = env("GROK_AUTH_ISSUER") ?? GROK_ISSUER_DEFAULT;
const grokClientId = env("GROK_AUTH_CLIENT_ID");
const grokClientSecret = env("GROK_AUTH_CLIENT_SECRET");
const brokerConfigured = Boolean(grokClientId && grokClientSecret);

/**
 * True when real auth is enforced: Google, email/password, phone Twilio,
 * leftover Twitter secrets, or explicit broker. Email/password alone is enough
 * for DB mode when VITE_AUTH_ENABLED is not false.
 */
export const authConfigured =
  !authDisabled &&
  (socialConfigured ||
    brokerConfigured ||
    emailAndPasswordEnabled ||
    phoneTwilioConfigured);

async function sendTwilioOTP(phone: string, code: string): Promise<void> {
  if (!phoneTwilioConfigured) {
    throw new Error("Phone sign-in needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
  }
  const to = normalizeIndiaPhone(phone) ?? phone;
  const body = new URLSearchParams({
    To: to,
    From: twilioPhoneNumber as string,
    Body: `Your Money Mate code is ${code}`,
  });
  const authHeader = Buffer.from(
    `${twilioAccountSid}:${twilioAuthToken}`,
  ).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Could not send SMS (${res.status}). Try again.`);
  }
}

// This app's own Better Auth origin. When deployed the deployer injects the
// public URL. In the sandbox live preview there's no fixed URL (each preview gets
// a dynamic `*.grok-sandbox.com` host), so we hand Better Auth a dynamic baseURL:
// it derives the origin per-request from the (proxied) host, validated against the
// preview allowlist, which makes the OAuth `redirect_uri` the concrete preview URL
// the broker's preview client accepts.
//
// On Vercel, each hash deploy gets a unique `*.vercel.app` host. Prefer setting
// `BETTER_AUTH_URL` to the stable production host users open; until then we derive
// from `VERCEL_URL` / `*.vercel.app` so "Invalid origin" does not break OAuth.
// When `BETTER_AUTH_URL` is set, keep that string baseURL but still trust the
// current Vercel deployment origin so a redeploy host mismatch is less brittle.
const explicitBaseURL = env("BETTER_AUTH_URL");
// Explicit `string[]` (not a readonly tuple) — Better Auth's DynamicBaseURLConfig
// requires a mutable `allowedHosts: string[]`.
const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
// Local `npm run dev` (port 8080 contract). Browsers may send Origin as any of
// these for the same server — trusting only `localhost` rejects `127.0.0.1` and
// breaks email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

/** Vercel injects hostname without protocol (e.g. `app-abc.vercel.app`). */
const vercelHost = env("VERCEL_URL")?.replace(/^https?:\/\//, "");
const vercelOrigin = vercelHost ? `https://${vercelHost}` : undefined;
const onVercel = Boolean(env("VERCEL") || vercelHost);

/** Optional comma-separated full origins to trust (e.g. custom domains). */
const extraTrustedOrigins: string[] = (env("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const VERCEL_ALLOWED_HOSTS: string[] = ["*.vercel.app", "localhost", "127.0.0.1", "[::1]"];

const baseURL = explicitBaseURL
  ? explicitBaseURL
  : onVercel
    ? {
        allowedHosts: [...VERCEL_ALLOWED_HOSTS],
        // Vercel deployments are always HTTPS; keep auto so local loopback still works.
        protocol: "auto" as const,
        fallback: vercelOrigin ?? "https://localhost",
      }
    : {
        // Include loopback hosts so dynamic baseURL resolves for local email/password
        // (not only the preview wildcard).
        allowedHosts: [...previewAllowedHosts, "localhost", "127.0.0.1", "[::1]"],
        // `auto` → trust both http:// and https:// expansions of allowedHosts
        // (preview is https; local dev is http).
        protocol: "auto" as const,
        fallback: "http://localhost:8080",
      };

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
// Always merge: explicit BETTER_AUTH_URL, current Vercel origin, extras, local dev.
const trustedOrigins: string[] = [
  ...(explicitBaseURL ? [explicitBaseURL] : []),
  ...(vercelOrigin ? [vercelOrigin] : []),
  ...extraTrustedOrigins,
  ...LOCAL_DEV_ORIGINS,
  // Preview / dynamic hosts when not pinned to a single BETTER_AUTH_URL
  ...(!explicitBaseURL && !onVercel
    ? [
        ...previewAllowedHosts,
        ...previewAllowedHosts.flatMap((host) => [
          `https://${host}`,
          `http://${host}`,
        ]),
      ]
    : []),
  ...(!explicitBaseURL && onVercel
    ? [
        "*.vercel.app",
        "https://*.vercel.app",
        "http://*.vercel.app",
      ]
    : []),
];

const databaseUrl = env("DATABASE_URL");

// Static broker OAuth endpoints (skip OIDC discovery). Only used when
// brokerConfigured — explicit GROK_AUTH_CLIENT_ID + GROK_AUTH_CLIENT_SECRET.
const issuerBase = grokIssuer.replace(/\/+$/, "");
const grokAuthorizationUrl = `${issuerBase}/api/auth/oauth2/authorize`;
const grokTokenUrl = `${issuerBase}/api/auth/oauth2/token`;
const grokUserInfoUrl = `${issuerBase}/api/auth/oauth2/userinfo`;

// Real Postgres when `DATABASE_URL` is set (deployed apps), else the app's
// embedded PGLite (preview) via a Kysely dialect — so Better Auth persists to the
// SAME DB as app data, including email/password users. Both use the Better Auth
// schema from `migrations/auth/0001_auth.sql`, copied into `migrations/` when
// the app turns sign-in on.
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name — also read by the live-preview popup completion page. */
export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

const socialProviders = {
  ...(googleConfigured
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
        },
      }
    : {}),
  ...(twitterConfigured
    ? {
        twitter: {
          clientId: twitterClientId as string,
          clientSecret: twitterClientSecret as string,
        },
      }
    : {}),
};

// Built separately so the `betterAuth({...})` call stays easy to edit without
// breaking brackets (models often trip on the conditional plugin spread).
const grokOAuthPlugin = brokerConfigured
  ? genericOAuth({
      config: GROK_BROKER_PROVIDERS.map(({ providerId, idp }) => ({
        providerId,
        clientId: grokClientId as string,
        clientSecret: grokClientSecret as string,
        authorizationUrl: grokAuthorizationUrl,
        tokenUrl: grokTokenUrl,
        userInfoUrl: grokUserInfoUrl,
        scopes: ["openid", "profile", "email"],
        authorizationUrlParams: { idp, prompt: "login" },
      })),
    })
  : null;

export const auth = betterAuth({
  baseURL,
  // Deployed apps inject BETTER_AUTH_SECRET. Preview: process-stable secret on
  // globalThis so HMR doesn't invalidate PGLite-backed sessions (see above).
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,

  // CSRF / origin check for credentialed auth POSTs (email sign-up/sign-in, …).
  // See `trustedOrigins` construction above — must cover live preview hosts AND
  // local loopback variants, or clients get "Invalid origin".
  trustedOrigins,

  // Encrypt broker-issued OAuth tokens at rest, and treat the broker's upstreams
  // as trusted first-party identities. The broker owns identity and X emails are
  // synthetic/unverified, so WITHOUT this a login can fail with
  // `account_not_linked` (Better Auth refuses to attach an untrusted, unverified
  // identity to an existing user). Google and X carry DISTINCT emails, so this
  // never merges them into one user — they stay separate identities.
  ...(socialConfigured ? { socialProviders } : {}),

  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [
        ...AUTH_PROVIDERS.map((p) => p.providerId),
        ...(brokerConfigured
          ? GROK_BROKER_PROVIDERS.map((p) => p.providerId)
          : []),
        GATE_PROVIDER_ID,
      ],
      // X's synthetic email is never "verified", so don't gate linking on the
      // local user's email-verified state.
      requireLocalEmailVerified: false,
    },
  },

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the DB — this shrinks the "loading"
  // window and reduces auth flicker. See the `auth` skill for the full
  // flicker-prevention guidance (gate on `isPending`; SSR the session).
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Local email/password — toggled only via `./email-password` (not a plugin).
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  // `__Host-` prefixed cookies: the browser REFUSES any same-named cookie that
  // carries a `Domain` attribute, so a sibling `*.grok.me` app cannot "toss" a
  // `Domain=.grok.me` session cookie onto this app. `__Host-` requires Secure +
  // Path=/ + no Domain; Better Auth otherwise uses `__Secure-` (which permits
  // Domain), so we drop its auto prefix (`useSecureCookies: false`) and set
  // Secure + the names ourselves. (Browsers allow Secure cookies on
  // `http://localhost`, so local dev still works.)
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },

  plugins: [
    gateIdentitySessions(),

    // Optional Grok broker genericOAuth (only when explicit GROK_AUTH_* set).
    ...(grokOAuthPlugin ? [grokOAuthPlugin] : []),

    // Phone OTP (India +91). SMS only when TWILIO_* are set.
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        await sendTwilioOTP(phone, code);
      },
      phoneNumberValidator: (phone) => isValidIndiaPhone(phone),
      signUpOnVerification: {
        getTempEmail: (phone) => tempPhoneEmail(phone),
        getTempName: (phone) => phone,
      },
    }),

    // Accept `Authorization: Bearer <session-token>` as an alternative to the
    // cookie. Needed for the LIVE PREVIEW: the app runs in an embedded iframe
    // where cookies are partitioned, so after popup sign-in it authenticates with
    // a bearer token instead (see `client.ts` / the `auth` skill). The hook only
    // fires when an Authorization header is present, so the cookie path
    // (deployed apps) is unaffected.
    bearer(),

    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

// Re-exported for convenience; the arrays live in the dependency-free
// `providers.ts` so the client can import them too.
export { AUTH_PROVIDERS, GROK_PROVIDERS, GROK_BROKER_PROVIDERS } from "./providers";

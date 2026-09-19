/**
 * Sign-in providers shared by the UI and auth wiring.
 *
 * Dependency-free so the client can import without pulling Better Auth / `pg`.
 *
 * Ship mode: Better Auth built-in **Google** social only — `providerId` is
 * `google`, callback at `/api/auth/callback/google`. Email/password and phone
 * OTP are separate (not listed here).
 *
 * Optional fallback: Grok auth broker via `genericOAuth` when
 * `GROK_AUTH_CLIENT_ID` + `GROK_AUTH_CLIENT_SECRET` are set explicitly
 * (never the preview baked defaults). Those use `grok-*` ids and
 * `/api/auth/oauth2/callback/<providerId>`.
 */
export type AuthProvider = {
  /** Local provider id; also the OAuth callback path segment. */
  providerId: string;
  /** Upstream id for icons / branching (`google`). */
  idp: string;
  /** Human label for the sign-in button ("Continue with …"). */
  label: string;
};

/** Direct Better Auth social providers — what the sign-in UI renders. */
export const AUTH_PROVIDERS: readonly AuthProvider[] = [
  { providerId: "google", idp: "google", label: "Google" },
];

/**
 * Grok broker genericOAuth providers (server only when explicit GROK_AUTH_*).
 * Not shown in the UI unless you switch the client list to these.
 */
export const GROK_BROKER_PROVIDERS: readonly AuthProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
];

/**
 * Alias for UI imports that still say `GROK_PROVIDERS`. Same as `AUTH_PROVIDERS`
 * (direct social). Broker ids live in `GROK_BROKER_PROVIDERS`.
 */
export const GROK_PROVIDERS = AUTH_PROVIDERS;

/** True when `providerId` is a Grok broker genericOAuth id (`grok-*`). */
export function isBrokerProviderId(providerId: string): boolean {
  return providerId.startsWith("grok-");
}

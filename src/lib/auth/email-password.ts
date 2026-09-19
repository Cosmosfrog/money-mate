/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Enabled for Ship: Google + email + phone. Forms use `authClient.signUp.email` /
 * `authClient.signIn.email` from `@/lib/auth/client`.
 *
 * Do NOT edit `server.ts` for the toggle — that file reads this flag.
 */
export const emailAndPasswordEnabled = true;

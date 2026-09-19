import { authClient } from "@/lib/auth/client";
import { isBrokerProviderId } from "@/lib/auth/providers";

const BEARER_KEY = "grok-auth.bearer-token";

function inIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isSandboxHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".grok-sandbox.com");
}

function waitForPopupToken(popup: Window): Promise<string | null> {
  return new Promise((resolve) => {
    const origin = window.location.origin;
    let settled = false;
    let closeTimer: number | undefined;
    const settle = (token: string | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollTimer);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      window.removeEventListener("message", onMessage);
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { source?: string; token?: string | null } | undefined;
      if (!data || data.source !== "grok-auth-popup") return;
      settle(data.token ?? null);
    };
    const pollTimer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(pollTimer);
      closeTimer = window.setTimeout(() => settle(null), 400);
    }, 300);
    window.addEventListener("message", onMessage);
  });
}

async function signInViaPopup(providerId: string): Promise<void> {
  const origin = window.location.origin;
  const url = `${origin}/auth/popup?providerId=${encodeURIComponent(providerId)}`;
  const popup = window.open(url, `grok-signin-${Date.now()}`, "popup,width=500,height=650");
  if (!popup) {
    throw new Error("Allow pop-ups for this site, then tap Google or X again.");
  }
  const token = await waitForPopupToken(popup);
  if (!token) throw new Error("Sign-in was cancelled or failed.");
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* ignore */
  }
  try {
    await authClient.getSession();
  } catch {
    /* session store recovers on next fetch */
  }
}

/**
 * Start Google/X sign-in without waiting on a prior sign-out.
 * Embedded / sandbox: popup on the tap so OAuth is not framed.
 * Top-level: Better Auth social redirect (or broker oauth2 for grok-* ids).
 */
export async function startProviderSignIn(providerId: string): Promise<void> {
  if (inIframe() || isSandboxHost()) {
    await signInViaPopup(providerId);
    return;
  }
  if (isBrokerProviderId(providerId)) {
    const { data, error } = await authClient.signIn.oauth2({
      providerId,
      callbackURL: "/",
      errorCallbackURL: "/",
    });
    if (error) throw new Error(error.message ?? "Sign-in failed. Try again.");
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    throw new Error("Sign-in failed. Try again.");
  }
  const { data, error } = await authClient.signIn.social({
    provider: providerId as "google" | "twitter",
    callbackURL: "/",
    errorCallbackURL: "/",
  });
  if (error) throw new Error(error.message ?? "Sign-in failed. Try again.");
  if (data?.url) {
    window.location.assign(data.url);
    return;
  }
  throw new Error("Sign-in failed. Try again.");
}

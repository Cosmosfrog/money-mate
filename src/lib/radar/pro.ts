export const FREE_BILL_CAP = 12;
export const PRO_TRIAL_DAYS = 7;

export type ProPlanId = "monthly" | "yearly";

export const PRO_PLANS = {
  monthly: {
    id: "monthly" as const,
    amount: 49,
    period: "month" as const,
    url: "https://buy.stripe.com/test_bJebJ322NdQc5Yf5KkdIA01",
    blurb: "Flexible. Cancel any month.",
  },
  yearly: {
    id: "yearly" as const,
    amount: 399,
    period: "year" as const,
    perMonth: 33,
    save: 189,
    url: "https://buy.stripe.com/test_bJeeVf36RcM82M3egQdIA02",
    blurb: "Best value. About two months free.",
  },
} as const;

export const PRO_PRICE_INR = PRO_PLANS.monthly.amount;
export const PRO_YEARLY_INR = PRO_PLANS.yearly.amount;
export const PRO_PAY_URL = PRO_PLANS.yearly.url;

export const PRO_PERKS = [
  "Unlimited bills",
  "90-day cashflow",
  "Can I afford this EMI",
  "Subscription waste and leftover goals",
] as const;

export const CHECKOUT_FLAG_KEY = "mm-checkout-success";
const PENDING = "mm-pro-pending";

export function captureCheckoutReturn() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("checkout") !== "success") return;
  localStorage.setItem(CHECKOUT_FLAG_KEY, "1");
  sessionStorage.removeItem(PENDING);
  url.searchParams.delete("checkout");
  const qs = url.searchParams.toString();
  window.history.replaceState({}, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
}

export function consumeCheckoutSuccess(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(CHECKOUT_FLAG_KEY) !== "1") return false;
  localStorage.removeItem(CHECKOUT_FLAG_KEY);
  sessionStorage.removeItem(PENDING);
  return true;
}

export function startProCheckout(
  plan: ProPlanId = "yearly",
  opts?: { userId?: string | null; email?: string | null },
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING, String(Date.now()));
  const url = new URL(PRO_PLANS[plan].url);
  // Payment Links accept client_reference_id + prefilled_email as query params.
  if (opts?.userId) url.searchParams.set("client_reference_id", opts.userId);
  if (opts?.email) url.searchParams.set("prefilled_email", opts.email);
  const payUrl = url.toString();
  const popup = window.open(payUrl, "_blank", "noopener,noreferrer");
  if (!popup) window.location.assign(payUrl);
}

export function pendingCheckoutMatured(minMs = 8000): boolean {
  if (typeof window === "undefined") return false;
  const t = Number(sessionStorage.getItem(PENDING) || 0);
  if (!t) return false;
  if (Date.now() - t < minMs) return false;
  sessionStorage.removeItem(PENDING);
  return true;
}

/** Optimistic unlock from ?checkout=success only. Server is_pro is source of truth. */
export function tryUnlockPro(): boolean {
  return consumeCheckoutSuccess();
}

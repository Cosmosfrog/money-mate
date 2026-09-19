import Stripe from "stripe";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";

/** Deployed public origin — Payment Link after_completion redirect target. */
export const PRO_PUBLIC_ORIGIN =
  "https://money-mate-e9cbi8507-money-mate1.vercel.app";

/** Configure this as the Payment Link redirect URL in Stripe Dashboard. */
export const PRO_SUCCESS_URL = `${PRO_PUBLIC_ORIGIN}/?checkout=success`;

export function stripeWebhookSecret(): string | undefined {
  return env("STRIPE_WEBHOOK_SECRET");
}

export function stripeSecretKey(): string | undefined {
  return env("STRIPE_SECRET_KEY");
}

/** Stripe client. Secret key unused for signature verification alone. */
export function getStripe(): Stripe {
  return new Stripe(stripeSecretKey() || "sk_unused_webhook_verify_only");
}

function asBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

/**
 * Set radar_settings.is_pro = true. Inserts a minimal row when missing
 * (other columns use migration defaults).
 */
export async function grantProForUserId(userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;
  const sql = await getSql();
  await sql`
    insert into radar_settings (user_id, is_pro)
    values (${id}, true)
    on conflict (user_id) do update set is_pro = true
  `;
  return true;
}

/** Resolve Better Auth user id by email (case-insensitive). */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select "id" from "user" where lower("email") = ${normalized} limit 1
  `;
  return rows[0]?.id ?? null;
}

type SessionLike = {
  client_reference_id?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
};

function emailFromSession(session: SessionLike): string | null {
  const fromDetails = session.customer_details?.email?.trim();
  if (fromDetails) return fromDetails;
  const fromTop = session.customer_email?.trim();
  return fromTop || null;
}

/**
 * Map Checkout Session → Money Mate user, then set is_pro.
 * Prefer client_reference_id (Payment Link ?client_reference_id=),
 * then metadata.userId / user_id, then customer email → "user".email.
 */
export async function grantProFromCheckoutSession(
  session: SessionLike,
): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  const paid =
    !session.payment_status ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!paid) {
    return { ok: false, reason: `payment_status=${session.payment_status}` };
  }

  const fromRef = session.client_reference_id?.trim();
  const fromMeta =
    session.metadata?.userId?.trim() || session.metadata?.user_id?.trim();
  let userId = fromRef || fromMeta || null;

  if (!userId) {
    const email = emailFromSession(session);
    if (email) userId = await findUserIdByEmail(email);
  }

  if (!userId) {
    return {
      ok: false,
      reason: "no user mapping (client_reference_id / email)",
    };
  }

  await grantProForUserId(userId);
  return { ok: true, userId };
}

export async function readIsPro(userId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select is_pro from radar_settings where user_id = ${userId}
  `;
  return asBool(rows[0]?.is_pro);
}

export async function handleStripeEvent(
  event: Stripe.Event,
): Promise<{ handled: boolean; detail?: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const result = await grantProFromCheckoutSession(session);
      return {
        handled: result.ok,
        detail: result.ok
          ? `granted userId=${result.userId}`
          : result.reason,
      };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.status !== "active" && sub.status !== "trialing") {
        return { handled: false, detail: `subscription status=${sub.status}` };
      }
      const metaUser =
        sub.metadata?.userId?.trim() || sub.metadata?.user_id?.trim();
      if (metaUser) {
        await grantProForUserId(metaUser);
        return { handled: true, detail: `granted userId=${metaUser}` };
      }
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId && stripeSecretKey()) {
        try {
          const stripe = getStripe();
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.email) {
            const userId = await findUserIdByEmail(customer.email);
            if (userId) {
              await grantProForUserId(userId);
              return {
                handled: true,
                detail: `granted userId=${userId} via email`,
              };
            }
          }
        } catch (err) {
          console.error("[stripe] customer lookup failed", err);
        }
      }
      return {
        handled: false,
        detail: "subscription without user metadata/email mapping",
      };
    }
    default:
      return { handled: false, detail: `ignored ${event.type}` };
  }
}

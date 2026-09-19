import { createFileRoute } from "@tanstack/react-router";
import {
  getStripe,
  handleStripeEvent,
  stripeWebhookSecret,
} from "@/lib/radar/stripe-pro.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = stripeWebhookSecret();
        if (!secret) {
          return new Response("Stripe webhook not configured", { status: 503 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing stripe-signature", { status: 400 });
        }

        const rawBody = await request.text();
        let event;
        try {
          event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
        } catch (err) {
          console.error("[stripe/webhook] signature verify failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          const result = await handleStripeEvent(event);
          return Response.json({
            received: true,
            type: event.type,
            handled: result.handled,
            detail: result.detail,
          });
        } catch (err) {
          console.error("[stripe/webhook] handler error", err);
          return new Response("Webhook handler failed", { status: 500 });
        }
      },
    },
  },
});

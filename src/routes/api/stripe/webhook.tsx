import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

import { createStripePlatformClient } from "@/lib/stripe-oauth.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

        if (!sig || !webhookSecret) {
          console.error("[Stripe webhook] Missing signature or webhook secret");
          return new Response("Webhook not configured", { status: 400 });
        }

        const stripe = createStripePlatformClient();
        if (!stripe) {
          console.error("[Stripe webhook] STRIPE_SECRET_KEY is not configured");
          return new Response("Webhook not configured", { status: 400 });
        }

        const rawBody = await request.text();

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err) {
          console.error("[Stripe webhook] Signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log("[Stripe webhook] Donation completed", {
              email: session.customer_email,
              amount: session.amount_total,
              account: event.account,
            });
            break;
          }
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log("[Stripe webhook] Recurring donation charged", {
              email: invoice.customer_email,
              amount: invoice.amount_paid,
              account: event.account,
            });
            break;
          }
          default:
            break;
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { z } from "zod";

import { loadWorkspaceStripeConnection } from "@/lib/stripe-connect.store.server";
import { createStripePlatformClient } from "@/lib/stripe-oauth.server";

const ALLOWED_ORIGIN =
  process.env.DONATION_WIDGET_ORIGIN?.replace(/\/$/, "") ??
  process.env.VITE_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ??
  "https://flowerchildren.world";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DonationSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  frequency: z.enum(["monthly", "one-time"]),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/donations/checkout")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const parsed = DonationSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }

        const { amount, frequency, first_name, last_name, email } = parsed.data;

        const connection = await loadWorkspaceStripeConnection();
        if (!connection) {
          console.error("[Donations] No connected Stripe account found");
          return jsonResponse({ error: "Donations are not configured yet" }, 503);
        }

        const stripe = createStripePlatformClient();
        if (!stripe) {
          console.error("[Donations] STRIPE_SECRET_KEY is not configured");
          return jsonResponse({ error: "Donations are not configured yet" }, 503);
        }

        const isMonthly = frequency === "monthly";

        const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
          currency: "usd",
          product_data: { name: "Donation to Flower Children World" },
          unit_amount: amount * 100,
          ...(isMonthly ? { recurring: { interval: "month" } } : {}),
        };

        try {
          const session = await stripe.checkout.sessions.create(
            {
              mode: isMonthly ? "subscription" : "payment",
              line_items: [{ price_data: priceData, quantity: 1 }],
              customer_email: email,
              metadata: { first_name, last_name },
              success_url: `${ALLOWED_ORIGIN}/donate/thank-you?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${ALLOWED_ORIGIN}/donate`,
            },
            { stripeAccount: connection.stripeUserId },
          );

          return jsonResponse({ url: session.url }, 200);
        } catch (err) {
          console.error("[Donations] Stripe Checkout creation failed", err);
          return jsonResponse({ error: "Could not start checkout" }, 502);
        }
      },
    },
  },
});

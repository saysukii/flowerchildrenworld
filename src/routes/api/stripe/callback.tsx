import { createFileRoute, redirect } from "@tanstack/react-router";

import { completeStripeOAuthCallback } from "@/lib/stripe-oauth.server";

export const Route = createFileRoute("/api/stripe/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const error = url.searchParams.get("error");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (error || !code || !state) {
          throw redirect({ href: "/settings?stripe=error", replace: true });
        }

        try {
          await completeStripeOAuthCallback({ code, state });
          throw redirect({ href: "/settings?stripe=connected", replace: true });
        } catch (callbackError) {
          console.error("[Stripe] OAuth callback failed", callbackError);
          throw redirect({ href: "/settings?stripe=error", replace: true });
        }
      },
    },
  },
});

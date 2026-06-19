import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/stripe-auth.server";
import {
  createStripeAuthorizeUrl,
  disconnectStripeConnection,
} from "@/lib/stripe-oauth.server";
import {
  getStripeDonationAnalytics,
  getStripeIntegrationStatus,
} from "@/lib/stripe.server";

export const fetchStripeIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.supabase, context.userId);
    return getStripeIntegrationStatus();
  });

export const fetchStripeDonationAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.supabase, context.userId);
    return getStripeDonationAnalytics();
  });

export const startStripeConnect = createServerFn({ method: "POST" })
  .inputValidator(z.object({ origin: z.string().min(1) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdminUser(context.supabase, context.userId);
    const url = await createStripeAuthorizeUrl({
      userId: context.userId,
      origin: data.origin,
    });
    return { url };
  });

export const disconnectStripeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.supabase, context.userId);
    await disconnectStripeConnection();
    return { disconnected: true as const };
  });

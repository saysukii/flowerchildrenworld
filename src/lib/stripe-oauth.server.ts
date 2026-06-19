import { randomBytes } from "node:crypto";

import Stripe from "stripe";

import {
  clearWorkspaceStripeConnection,
  consumeStripeOAuthState,
  createStripeOAuthState,
  loadWorkspaceStripeConnection,
  purgeExpiredStripeOAuthStates,
  saveWorkspaceStripeConnection,
} from "@/lib/stripe-connect.store.server";

export function getStripePlatformSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function getStripeClientId() {
  return process.env.STRIPE_CLIENT_ID?.trim() || null;
}

export function isStripeConnectConfigured() {
  return Boolean(getStripePlatformSecretKey() && getStripeClientId());
}

export function getStripeSetupIssues() {
  const issues: string[] = [];
  if (!getStripePlatformSecretKey()) issues.push("STRIPE_SECRET_KEY");
  if (!getStripeClientId()) issues.push("STRIPE_CLIENT_ID");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return issues;
}

export function getStripeSetupMessage(issues = getStripeSetupIssues()) {
  if (issues.length === 0) return null;
  return `Add ${issues.join(", ")} to your server environment and restart the dev server.`;
}

export function createStripePlatformClient() {
  const secretKey = getStripePlatformSecretKey();
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

export function buildStripeCallbackUrl(origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/stripe/callback`;
}

export async function createStripeAuthorizeUrl(input: {
  userId: string;
  origin: string;
}) {
  const clientId = getStripeClientId();
  const secretKey = getStripePlatformSecretKey();
  if (!clientId || !secretKey) {
    throw new Error(getStripeSetupMessage() ?? "Stripe Connect is not configured.");
  }

  await purgeExpiredStripeOAuthStates();

  const state = randomBytes(24).toString("hex");
  const redirectUri = buildStripeCallbackUrl(input.origin);

  await createStripeOAuthState({
    state,
    userId: input.userId,
    redirectUri,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    state,
    redirect_uri: redirectUri,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export async function completeStripeOAuthCallback(input: { code: string; state: string }) {
  const oauthState = await consumeStripeOAuthState(input.state);
  if (!oauthState) {
    throw new Error("Invalid or expired Stripe OAuth state.");
  }

  const stripe = createStripePlatformClient();
  const clientId = getStripeClientId();
  if (!stripe || !clientId) {
    throw new Error("Stripe Connect is not configured.");
  }

  const token = await stripe.oauth.token({
    grant_type: "authorization_code",
    code: input.code,
  });

  if (!token.stripe_user_id || !token.access_token) {
    throw new Error("Stripe did not return a connected account.");
  }

  const connectedStripe = new Stripe(token.access_token);
  const account = await connectedStripe.accounts.retrieve();

  const accountName =
    account.settings?.dashboard?.display_name ||
    account.business_profile?.name ||
    account.email ||
    "Stripe account";

  await saveWorkspaceStripeConnection({
    stripeUserId: token.stripe_user_id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    accountName,
    connectedBy: oauthState.userId,
  });

  return { accountName };
}

export async function disconnectStripeConnection() {
  const connection = await loadWorkspaceStripeConnection();
  const stripe = createStripePlatformClient();
  const clientId = getStripeClientId();

  if (connection && stripe && clientId) {
    try {
      await stripe.oauth.deauthorize({
        client_id: clientId,
        stripe_user_id: connection.stripeUserId,
      });
    } catch (error) {
      console.error("[Stripe] Failed to deauthorize connected account", error);
    }
  }

  await clearWorkspaceStripeConnection();
}

import Stripe from "stripe";

import { loadWorkspaceStripeConnection } from "@/lib/stripe-connect.store.server";
import {
  getStripePlatformSecretKey,
  getStripeSetupIssues,
} from "@/lib/stripe-oauth.server";
import {
  EMPTY_STRIPE_DONATIONS,
  type StripeDonationAnalytics,
  type StripeDonor,
  type StripeIntegrationStatus,
} from "@/lib/stripe-analytics";

const MAX_PAYMENTS = 500;

async function resolveStripeClient(): Promise<Stripe | null> {
  const connection = await loadWorkspaceStripeConnection();
  if (connection) {
    return new Stripe(connection.accessToken);
  }

  const secretKey = getStripePlatformSecretKey();
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function donorLabel(charge: Stripe.Charge) {
  const billing = charge.billing_details;
  return (
    billing.name?.trim() ||
    charge.receipt_email?.trim() ||
    (typeof charge.customer === "object" && charge.customer && !("deleted" in charge.customer)
      ? charge.customer.name || charge.customer.email
      : null) ||
    "Anonymous"
  );
}

async function listSucceededCharges(stripe: Stripe) {
  const charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore && charges.length < MAX_PAYMENTS) {
    const page = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.customer"],
    });

    charges.push(...page.data.filter((charge) => charge.paid && !charge.refunded));
    hasMore = page.has_more;
    startingAfter = page.data.at(-1)?.id;
  }

  return charges;
}

export async function getStripeIntegrationStatus(): Promise<StripeIntegrationStatus> {
  const setupIssues = getStripeSetupIssues();
  const configured = setupIssues.length === 0;

  const connection = await loadWorkspaceStripeConnection();
  if (connection) {
    return {
      connected: true,
      configured,
      accountName: connection.accountName,
      setupIssues,
    };
  }

  const stripe = await resolveStripeClient();
  if (!stripe) {
    return { connected: false, configured, accountName: "", setupIssues };
  }

  try {
    const account = await stripe.accounts.retrieve();
    return {
      connected: true,
      configured,
      accountName:
        account.settings?.dashboard?.display_name ||
        account.business_profile?.name ||
        "Stripe account",
      setupIssues,
    };
  } catch (error) {
    console.error("[Stripe] Failed to verify integration status", error);
    return { connected: false, configured, accountName: "", setupIssues };
  }
}

export async function getStripeDonationAnalytics(): Promise<StripeDonationAnalytics> {
  const status = await getStripeIntegrationStatus();
  if (!status.connected) {
    return EMPTY_STRIPE_DONATIONS;
  }

  const stripe = await resolveStripeClient();
  if (!stripe) return EMPTY_STRIPE_DONATIONS;

  const [charges, subscriptions] = await Promise.all([
    listSucceededCharges(stripe),
    stripe.subscriptions.list({ status: "all", limit: 100 }),
  ]);

  const monthStart = startOfMonth().getTime() / 1000;
  const currency = charges[0]?.currency ?? "usd";

  let monthTotalCents = 0;
  let allTimeTotalCents = 0;
  let oneTimeCount = 0;

  for (const charge of charges) {
    allTimeTotalCents += charge.amount;
    if (charge.created >= monthStart) {
      monthTotalCents += charge.amount;
    }
    if (!charge.invoice) {
      oneTimeCount += 1;
    }
  }

  const recurringCount = subscriptions.data.filter((subscription) =>
    ["active", "trialing", "past_due"].includes(subscription.status),
  ).length;

  const recentDonors: StripeDonor[] = charges.slice(0, 10).map((charge) => ({
    name: donorLabel(charge),
    amountCents: charge.amount,
    currency: charge.currency,
    date: new Date(charge.created * 1000).toISOString(),
  }));

  return {
    connected: true,
    accountName: status.accountName,
    monthTotalCents,
    allTimeTotalCents,
    recurringCount,
    oneTimeCount,
    recentDonors,
    currency,
  };
}
